import mongoose from "mongoose";

const SpaceChatSchema = new mongoose.Schema({
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true },
  name: { type: String, default: "Chat" },
  createdBy: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model("SpaceChat", SpaceChatSchema);
