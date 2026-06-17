import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db";

export const contactRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";

// ─── Auth helper for admin routes ─────────────────────────────────────────
interface TokenPayload {
  userId: string;
  email: string;
}

function authenticate(req: Request, res: Response): TokenPayload | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required." });
    return null;
  }
  try {
    return jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
    return null;
  }
}

async function requireAdmin(auth: TokenPayload, res: Response): Promise<boolean> {
  const db = getDbPool();
  const result = await db.query("SELECT is_admin FROM users WHERE id = $1", [auth.userId]);
  if (result.rows.length === 0 || !result.rows[0].is_admin) {
    res.status(403).json({ error: "Admin access required." });
    return false;
  }
  return true;
}

// ============================================================================
// PUBLIC — Submit a contact message
// ============================================================================

// ─── POST /api/contact ────────────────────────────────────────────────────
contactRouter.post("/contact", async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    const errors: string[] = [];
    if (!name || !name.trim()) errors.push("Name is required.");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required.");
    if (!subject || !subject.trim()) errors.push("Subject is required.");
    if (!message || message.trim().length < 10) errors.push("Message must be at least 10 characters.");

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" ") });
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [name.trim(), email.trim().toLowerCase(), subject.trim(), message.trim()]
    );

    return res.status(201).json({
      message: "Your message has been sent. We'll respond within 2 working days.",
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    console.error("Error submitting contact message:", err);
    return res.status(500).json({ error: "Failed to send message. Please try again." });
  }
});

// ============================================================================
// ADMIN — Manage contact messages
// ============================================================================

// ─── GET /api/admin/contact ───────────────────────────────────────────────
contactRouter.get("/admin/contact", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, name, email, subject, message, is_read, created_at
       FROM contact_messages
       ORDER BY is_read ASC, created_at DESC`
    );

    return res.json({ messages: result.rows });
  } catch (err) {
    console.error("Error fetching contact messages:", err);
    return res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// ─── PUT /api/admin/contact/:id/read — Mark as read ───────────────────────
contactRouter.put("/admin/contact/:id/read", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const db = getDbPool();
    const result = await db.query(
      `UPDATE contact_messages SET is_read = TRUE WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Message not found." });
    }

    return res.json({ message: "Marked as read." });
  } catch (err) {
    console.error("Error marking message as read:", err);
    return res.status(500).json({ error: "Failed to update message." });
  }
});
