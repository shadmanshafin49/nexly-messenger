import mongoose from "mongoose";

const SpaceMessageSchema = new mongoose.Schema({
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "SpaceChat", required: true },
  sender: { type: String, required: true },
  content: { type: String, default: "" },
  loved: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("SpaceMessage", SpaceMessageSchema);
