import mongoose from "mongoose";

const roomSchema = mongoose.Schema({
  name: { type: String, required: [true, "A room must have a name"] },
  lastMessage: { type: String },
  messages: [
    {
      message: { type: String },
      name: { type: String },
      timestamp: { type: String },
      received: { type: Boolean },
    },
  ],
});

const Message = mongoose.model("room", roomSchema);
export default Message;
