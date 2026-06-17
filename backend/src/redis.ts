import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

export function getRedisClient(): Redis {
  return redis;
}

export async function testRedisConnection(r: Redis): Promise<void> {
  try {
    // ioredis with lazyConnect needs explicit connect
    if (r.status === "wait") {
      await r.connect();
    }
    const pong = await r.ping();
    console.log("Redis connected:", pong);
  } catch (err) {
    console.error("Redis connection failed:", err);
  }
}
