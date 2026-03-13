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
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "ID is required" });
  }

  try {
    // Check Redis cache first
    const cacheKey = `koleksi_${id}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log(`Serving detail ${id} from cache`);
      return res.status(200).json({ data: JSON.parse(cachedData) });
    }

    // Fetch from Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
    );

    const { data, error } = await supabase
      .from("koleksi")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Cache for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(data));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}
