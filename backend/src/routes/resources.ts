import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDbPool } from "../db";

export const resourcesRouter = Router();

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "text/plain", "text/csv",
      "application/zip", "application/x-rar-compressed",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV, ZIP, RAR."));
  },
});

// ─── GET /api/resources ───────────────────────────────────────────────────
resourcesRouter.get("/resources", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM resources r
       LEFT JOIN users u ON r.uploaded_by = u.id
       ORDER BY r.created_at DESC`
    );
    return res.json({ resources: result.rows });
  } catch (err) {
    console.error("Error fetching resources:", err);
    return res.status(500).json({ error: "Failed to fetch resources." });
  }
});

// ─── POST /api/resources/upload ───────────────────────────────────────────
resourcesRouter.post("/resources/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const { title, description, category, visibility, uploadedBy } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: "Title is required." });

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO resources (title, description, category, filename, original_name, mime_type, file_size, visibility, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        category || "general",
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        visibility || "members",
        uploadedBy || null,
      ]
    );

    return res.status(201).json({ resource: result.rows[0] });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to upload file." });
  }
});

// ─── PUT /api/resources/:id ───────────────────────────────────────────────
resourcesRouter.put("/resources/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, visibility } = req.body;

    const db = getDbPool();
    const result = await db.query(
      `UPDATE resources SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        visibility = COALESCE($4, visibility)
       WHERE id = $5
       RETURNING *`,
      [
        title?.trim() || null,
        description?.trim() ?? null,
        category || null,
        visibility || null,
        id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Resource not found." });
    return res.json({ resource: result.rows[0] });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ error: "Failed to update resource." });
  }
});

// ─── PUT /api/resources/:id/replace ───────────────────────────────────────
resourcesRouter.put("/resources/:id/replace", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    const db = getDbPool();

    // Get old record to delete old file
    const old = await db.query("SELECT filename FROM resources WHERE id = $1", [id]);
    if (old.rows.length === 0) {
      // Clean up uploaded file since resource doesn't exist
      fs.unlink(path.join(UPLOAD_DIR, req.file.filename), () => {});
      return res.status(404).json({ error: "Resource not found." });
    }

    // Delete old file
    const oldFile = path.join(UPLOAD_DIR, old.rows[0].filename);
    fs.unlink(oldFile, () => {});

    const result = await db.query(
      `UPDATE resources SET filename = $1, original_name = $2, mime_type = $3, file_size = $4 WHERE id = $5
       RETURNING *`,
      [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, id]
    );

    return res.json({ resource: result.rows[0] });
  } catch (err) {
    console.error("Replace error:", err);
    return res.status(500).json({ error: "Failed to replace file." });
  }
});

// ─── DELETE /api/resources/:id ─────────────────────────────────────────────
resourcesRouter.delete("/resources/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDbPool();

    const result = await db.query("SELECT filename FROM resources WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Resource not found." });

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, result.rows[0].filename);
    fs.unlink(filePath, () => {});

    await db.query("DELETE FROM resources WHERE id = $1", [id]);
    return res.json({ message: "Resource deleted." });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ error: "Failed to delete resource." });
  }
});

// ─── POST /api/resources/:id/download ──────────────────────────────────────
resourcesRouter.post("/resources/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDbPool();

    const result = await db.query(
      `UPDATE resources SET download_count = download_count + 1 WHERE id = $1 RETURNING filename, original_name`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Resource not found." });

    const filePath = path.join(UPLOAD_DIR, result.rows[0].filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk." });

    return res.download(filePath, result.rows[0].original_name);
  } catch (err) {
    console.error("Download error:", err);
    return res.status(500).json({ error: "Failed to download file." });
  }
});
