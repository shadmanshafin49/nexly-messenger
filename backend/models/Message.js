import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  receiver: { type: String, required: true },
  content: { type: String, default: "" },
  type: { type: String, enum: ["text", "image"], default: "text" },
  imageUrl: { type: String, default: "" },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  loved: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Message", MessageSchema);
