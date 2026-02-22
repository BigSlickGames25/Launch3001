import mongoose from "mongoose";

export async function connectDb(uri) {
  await mongoose.connect(uri, { autoIndex: true });
  console.log("Mongo connected");
}

export const Score = mongoose.model("Score", new mongoose.Schema({
  name: { type: String, required: true, maxlength: 18 },
  score: { type: Number, required: true, min: 0 },
  level: { type: Number, required: true, min: 1 },
  createdAt: { type: Date, default: Date.now }
}));
