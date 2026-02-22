import Redis from "ioredis";

export function connectRedis(url) {
  const r = new Redis(url);
  r.on("connect", () => console.log("Redis connected"));
  return r;
}
