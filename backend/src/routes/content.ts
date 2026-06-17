import { Router, Request, Response } from "express";
import { getDbPool } from "../db";

export const contentRouter = Router();

type TableInfo = {
  table: string;
  idType: string;
};

function ct(tab: string): TableInfo {
  const map: Record<string, TableInfo> = {
    news: { table: "content_news", idType: "uuid" },
    events: { table: "content_events", idType: "uuid" },
    leadership: { table: "content_leadership", idType: "uuid" },
    faq: { table: "content_faq", idType: "uuid" },
  };
  return map[tab] || { table: "", idType: "" };
}

// ─── GET /api/content/:type ────────────────────────────────────────────────
contentRouter.get("/content/:type", async (req: Request, res: Response) => {
  const t = ct(req.params.type);
  if (!t.table) return res.status(400).json({ error: "Invalid content type." });

  const publishedOnly = req.query.all !== "true";

  try {
    const db = getDbPool();
    let query = `SELECT * FROM ${t.table}`;
    const params: any[] = [];

    if (req.params.type === "news" && publishedOnly) {
      query += ` WHERE status = 'published'`;
    }
    if (req.params.type === "leadership" || req.params.type === "faq") {
      query += ` WHERE is_active = TRUE`;
    }
    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query);
    return res.json({ items: result.rows });
  } catch (err) {
    console.error(`Error fetching ${req.params.type}:`, err);
    return res.status(500).json({ error: "Failed to fetch content." });
  }
});

// ─── POST /api/content/:type ───────────────────────────────────────────────
contentRouter.post("/content/:type", async (req: Request, res: Response) => {
  const t = ct(req.params.type);
  if (!t.table) return res.status(400).json({ error: "Invalid content type." });

  const body = req.body;
  const db = getDbPool();

  try {
    let result;
    switch (req.params.type) {
      case "news": {
        result = await db.query(
          `INSERT INTO content_news (title, body, image_url, status, published_at, created_by)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [body.title, body.body, body.image_url || null, body.status || "draft",
           body.status === "published" ? new Date() : null, body.createdBy || null]
        );
        break;
      }
      case "events": {
        result = await db.query(
          `INSERT INTO content_events (title, description, location, event_date, event_time, badge_label, badge_class, max_attendees, status, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [body.title, body.description || null, body.location || null, body.eventDate,
           body.eventTime || null, body.badgeLabel || null, body.badgeClass || null,
           body.maxAttendees || null, body.status || "open", body.createdBy || null]
        );
        break;
      }
      case "leadership": {
        result = await db.query(
          `INSERT INTO content_leadership (name, role, bio, photo_url, term_label, sort_order, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
          [body.name, body.role, body.bio || null, body.photoUrl || null,
           body.termLabel || null, body.sortOrder || 0, body.createdBy || null]
        );
        break;
      }
      case "faq": {
        result = await db.query(
          `INSERT INTO content_faq (question, answer, category, sort_order, created_by)
           VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [body.question, body.answer, body.category || "general", body.sortOrder || 0, body.createdBy || null]
        );
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid content type." });
    }
    return res.status(201).json({ item: result!.rows[0] });
  } catch (err) {
    console.error(`Error creating ${req.params.type}:`, err);
    return res.status(500).json({ error: "Failed to create content." });
  }
});

// ─── PUT /api/content/:type/:id ────────────────────────────────────────────
contentRouter.put("/content/:type/:id", async (req: Request, res: Response) => {
  const t = ct(req.params.type);
  if (!t.table) return res.status(400).json({ error: "Invalid content type." });

  const body = req.body;
  const { id } = req.params;
  const db = getDbPool();

  try {
    let result;
    switch (req.params.type) {
      case "news": {
        result = await db.query(
          `UPDATE content_news SET title=$1, body=$2, image_url=$3, status=$4,
           published_at = CASE WHEN $4 = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
           WHERE id=$5 RETURNING *`,
          [body.title, body.body, body.image_url || null, body.status || "draft", id]
        );
        break;
      }
      case "events": {
        result = await db.query(
          `UPDATE content_events SET title=$1, description=$2, location=$3, event_date=$4,
           event_time=$5, badge_label=$6, badge_class=$7, max_attendees=$8, status=$9
           WHERE id=$10 RETURNING *`,
          [body.title, body.description || null, body.location || null, body.eventDate,
           body.eventTime || null, body.badgeLabel || null, body.badgeClass || null,
           body.maxAttendees || null, body.status || "open", id]
        );
        break;
      }
      case "leadership": {
        result = await db.query(
          `UPDATE content_leadership SET name=$1, role=$2, bio=$3, photo_url=$4,
           term_label=$5, sort_order=$6, is_active=$7 WHERE id=$8 RETURNING *`,
          [body.name, body.role, body.bio || null, body.photoUrl || null,
           body.termLabel || null, body.sortOrder || 0, body.isActive ?? true, id]
        );
        break;
      }
      case "faq": {
        result = await db.query(
          `UPDATE content_faq SET question=$1, answer=$2, category=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
          [body.question, body.answer, body.category || "general", body.sortOrder || 0, body.isActive ?? true, id]
        );
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid content type." });
    }
    if (result!.rows.length === 0) return res.status(404).json({ error: "Not found." });
    return res.json({ item: result!.rows[0] });
  } catch (err) {
    console.error(`Error updating ${req.params.type}:`, err);
    return res.status(500).json({ error: "Failed to update content." });
  }
});

// ─── DELETE /api/content/:type/:id ─────────────────────────────────────────
contentRouter.delete("/content/:type/:id", async (req: Request, res: Response) => {
  const t = ct(req.params.type);
  if (!t.table) return res.status(400).json({ error: "Invalid content type." });

  try {
    const db = getDbPool();
    await db.query(`DELETE FROM ${t.table} WHERE id = $1`, [req.params.id]);
    return res.json({ message: "Deleted." });
  } catch (err) {
    console.error(`Error deleting ${req.params.type}:`, err);
    return res.status(500).json({ error: "Failed to delete content." });
  }
});
