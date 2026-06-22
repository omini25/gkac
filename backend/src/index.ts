import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { getDbPool, testDbConnection } from "./db";
import { getRedisClient, testRedisConnection } from "./redis";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { paymentsRouter } from "./routes/payments";
import { resourcesRouter } from "./routes/resources";
import { contentRouter } from "./routes/content";
import { electionsRouter } from "./routes/elections";
import { adminMembersRouter } from "./routes/admin-members";
import { adminReportsRouter } from "./routes/admin-reports";
import { adminSettingsRouter } from "./routes/admin-settings";
import { adminProfileRouter } from "./routes/admin-profile";
import { contactRouter } from "./routes/contact";
import { duesRouter } from "./routes/dues";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Split comma-separated origins and strip trailing slashes
const ALLOWED_ORIGINS = CORS_ORIGIN.split(",").map((o) => o.trim().replace(/\/+$/, ""));

async function main() {
  const app = express();

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  }));
  app.use(express.json());

  // Serve uploaded files
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  // Initialize connections
  const db = getDbPool();
  const redis = getRedisClient();

  // Test connections (non-blocking)
  testDbConnection(db).catch(console.error);
  testRedisConnection(redis).catch(console.error);

  // Routes
  app.use("/api", healthRouter);
  app.use("/api", authRouter);
  app.use("/api", paymentsRouter);
  app.use("/api", resourcesRouter);
  app.use("/api", contentRouter);
  app.use("/api", electionsRouter);
app.use("/api", adminMembersRouter);
app.use("/api", adminReportsRouter);
app.use("/api", adminSettingsRouter);
app.use("/api", adminProfileRouter);
app.use("/api", contactRouter);
app.use("/api", duesRouter);

  // Example: items route with Redis caching
  app.get("/api/items", async (_req, res) => {
    try {
      const cacheKey = "items:all";

      // Try Redis cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ data: JSON.parse(cached), source: "cache" });
      }

      // Fall back to PostgreSQL
      const result = await db.query("SELECT * FROM items ORDER BY created_at DESC");
      const items = result.rows;

      // Cache for 60 seconds
      await redis.setex(cacheKey, 60, JSON.stringify(items));

      return res.json({ data: items, source: "db" });
    } catch (err) {
      console.error("Error fetching items:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
