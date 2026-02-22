export function rateLimit(redis, { keyPrefix = "rl:", limit = 10, windowSec = 30 } = {}) {
  return async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "na";
    const key = `${keyPrefix}${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSec);
    if (count > limit) return res.status(429).json({ ok: false, error: "Too many requests" });
    next();
  };
}
