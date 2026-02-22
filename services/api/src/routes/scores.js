import express from "express";
import { Score } from "../db.js";

export function scoresRouter(redis) {
  const r = express.Router();

  r.get("/", async (req, res) => {
    const top = await Score.find().sort({ score: -1 }).limit(50).lean();
    res.json({ ok: true, top });
  });

  r.post("/", async (req, res) => {
    const { name, score, level } = req.body || {};
    if (typeof name !== "string" || name.trim().length < 1) return res.status(400).json({ ok: false, error: "Bad name" });
    if (typeof score !== "number" || score < 0 || score > 9999999) return res.status(400).json({ ok: false, error: "Bad score" });
    if (typeof level !== "number" || level < 1 || level > 999) return res.status(400).json({ ok: false, error: "Bad level" });

    const k = `name:${name.trim().toLowerCase()}`;
    const c = await redis.incr(k);
    if (c === 1) await redis.expire(k, 30);
    if (c > 6) return res.status(429).json({ ok: false, error: "Slow down" });

    const doc = await Score.create({ name: name.trim(), score, level });
    res.json({ ok: true, id: doc._id });
  });

  return r;
}
