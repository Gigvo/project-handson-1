import { createClient } from "@supabase/supabase-js";
import { createClient as createRedisClient } from "redis";
import dotenv from "dotenv";

dotenv.config({ path: ".env.development.local" });

const redis = createRedisClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => console.log("Redis Client Error", err));
redis.connect();

export default async function handler(req, res) {
  const startTime = Date.now();
  try {
    // 1. Check Redis cache first
    const cachedData = await redis.get("koleksi_list");
    if (cachedData) {
      console.log("Serving list from cache");
      const duration = Date.now() - startTime;
      return res
        .status(200)
        .setHeader("X-Cache", "HIT")
        .setHeader("X-Response-Time", `${duration}ms`)
        .json({ data: JSON.parse(cachedData) });
    }

    // 2. If not in cache, fetch from Supabase (only path and id)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    const { data, error } = await supabase
      .from("koleksi")
      .select("id, path, judul");

    console.log("Data:", data);
    console.log("Error:", error);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 3. Cache the list for 1 hour (3600 seconds)
    await redis.setEx("koleksi_list", 3600, JSON.stringify(data));

    const duration = Date.now() - startTime;
    return res
      .status(200)
      .setHeader("X-Cache", "MISS")
      .setHeader("X-Response-Time", `${duration}ms`)
      .json({ data });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
