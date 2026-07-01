import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { getDbPool, testDbConnection } from "./db";
import { getRedisClient, testRedisConnection } from "./redis";
import { getUploadsDir } from "./uploads";
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
import { meetingsRouter } from "./routes/meetings";

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
  app.use("/uploads", express.static(getUploadsDir()));

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
app.use("/api", meetingsRouter);

  // ─── Global error handler (catches MulterError and other request errors) ──
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Multer file size error
    if (err.code === "LIMIT_FILE_SIZE") {
      const fieldName = err.field || "file";
      return res.status(413).json({
        error: `The ${fieldName} file exceeds the maximum allowed size. Please upload a smaller file.`,
      });
    }
    // Multer unexpected file / field errors
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected file field. Please check your upload and try again.",
      });
    }
    // Multer file type errors (custom fileFilter rejections)
    if (err.message && (err.message.includes("File type") || err.message.includes("Only"))) {
      return res.status(400).json({ error: err.message });
    }
    // Generic multer errors
    if (err.name === "MulterError") {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    // Pass through to default Express error handler
    console.error("Unhandled error:", err);
    return res.status(500).json({ error: "An unexpected error occurred." });
  });

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
