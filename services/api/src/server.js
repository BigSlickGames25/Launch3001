import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import { connectRedis } from "./redis.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { scoresRouter } from "./routes/scores.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));

const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;
const PORT = Number(process.env.PORT || 8080);

const redis = connectRedis(REDIS_URL);

await connectDb(MONGO_URI);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/scores", rateLimit(redis, { limit: 20, windowSec: 30 }));
app.use("/api/scores", scoresRouter(redis));

app.listen(PORT, () => console.log(`API on :${PORT}`));
