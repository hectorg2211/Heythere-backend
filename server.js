import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Pusher from "pusher";
import cors from "cors";

import Room from "./roomModel.js";
dotenv.config();

// Config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: process.env.APP_ID,
  key: process.env.PUSHER_ID,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: process.env.PUSHER_TLS,
});

// Middleware
app.use(express.json());
app.use(cors());

// Database configuration
const mongoUrl = process.env.MONGO_DB;
mongoose.connect(mongoUrl, { useNewUrlParser: true });

const db = mongoose.connection;
db.once("open", () => {
  console.log("MongoDB is connected");

  // Watch for changes on rooms collection
  const msgCollection = db.collection("rooms");
  const changeStream = msgCollection.watch();
  changeStream.on("change", (change) => {
    // Trigger pusher when a message is added
    if (change.operationType === "update") {
      const messages = change.updateDescription;
      pusher.trigger("rooms", "updated", {
        name: messages,
      });
    } else console.log("There was a an error triggering Pusher");
  });
});

// API routes
// app.get("/", (req, res) => res.status(200).send("Hello world"));

app.get("/api/v1/rooms", async (req, res) => {
  try {
    const { fields } = req.query;
    const filter = fields.split(",").join(" ");
    const rooms = await Room.find().select(filter);
    res.status(200).json({ status: "success", data: rooms });
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/api/v1/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);
    res.status(200).json({ status: "success", data: room });
  } catch (error) {
    res.status(404).send(error);
  }
});

app.post("/api/v1/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findById(id);
    const currentMessages = room.messages;
    currentMessages.push(req.body);
    await Room.findByIdAndUpdate(
      id,
      { messages: currentMessages },
      { new: true, runValidators: true }
    );
    // const updatedRoom = await Room.findByIdAndUpdate(id);
    res.status(201).json({ status: "success", data: room });
  } catch (error) {
    res.status(404).send(error);
  }
});

app.patch("/api/v1/rooms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Room.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(201).json({ status: "success", data: req.body });
  } catch (error) {
    res.status(404).send(error);
  }
});

app.post("/api/v1/rooms", (req, res) => {
  const newMessage = req.body;

  Room.create(newMessage, (error, data) => {
    if (error) res.status(500).send(error);
    else {
      res.status(201).json({
        status: "success",
        data,
      });
    }
  });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
