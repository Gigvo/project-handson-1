import { createClient as createRedisClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const redis = createRedisClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.log("Redis Client Error", err));
redis.connect();

export default async function handler(req, res) {
  try {
    await redis.del("koleksi_list");
    console.log("Cache cleared");
    return res.status(200).json({ message: "Cache cleared" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
