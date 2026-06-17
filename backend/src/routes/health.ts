import { Router, Request, Response } from "express";
import { getDbPool } from "../db";
import { getRedisClient } from "../redis";

export const healthRouter = Router();

healthRouter.get("/health", async (_req: Request, res: Response) => {
  const status: Record<string, string> = {};

  // Check DB
  try {
    const db = getDbPool();
    await db.query("SELECT 1");
    status.database = "ok";
  } catch {
    status.database = "error";
  }

  // Check Redis
  try {
    const redis = getRedisClient();
    await redis.ping();
    status.redis = "ok";
  } catch {
    status.redis = "error";
  }

  const allOk = Object.values(status).every((v) => v === "ok");
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    services: status,
  });
});
