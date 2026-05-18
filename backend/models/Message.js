import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
