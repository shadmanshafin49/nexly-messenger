import mongoose from "mongoose";

const SpaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, required: true },
  members: [{ type: String }],
}, { timestamps: true });

export default mongoose.model("Space", SpaceSchema);
