import { Router, Request, Response } from "express";
import { getDbPool } from "../db";

export const adminSettingsRouter = Router();

// ══════════════════════════════════════════════════════════════════════════
// MEMBERSHIP CATEGORIES
// ══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/settings/categories ──────────────────────────────────
adminSettingsRouter.get("/admin/settings/categories", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      "SELECT id, name, description, fee_kobo, min_experience_years, sort_order, is_active, created_at, updated_at FROM membership_categories ORDER BY sort_order"
    );
    return res.json({ categories: result.rows });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ error: "Failed to fetch categories." });
  }
});

// ─── POST /api/admin/settings/categories ─────────────────────────────────
adminSettingsRouter.post("/admin/settings/categories", async (req: Request, res: Response) => {
  try {
    const { name, description, fee_kobo, min_experience_years, sort_order } = req.body;
    if (!name || !fee_kobo) {
      return res.status(400).json({ error: "Name and fee are required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO membership_categories (name, description, fee_kobo, min_experience_years, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, fee_kobo, min_experience_years, sort_order, is_active`,
      [name.trim(), description || null, fee_kobo, min_experience_years || 0, sort_order ?? 0]
    );
    return res.status(201).json({ category: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A category with this name already exists." });
    }
    console.error("Error creating category:", err);
    return res.status(500).json({ error: "Failed to create category." });
  }
});

// ─── PUT /api/admin/settings/categories/:id ──────────────────────────────
adminSettingsRouter.put("/admin/settings/categories/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, fee_kobo, min_experience_years, sort_order, is_active } = req.body;

    const db = getDbPool();
    const existing = await db.query("SELECT id FROM membership_categories WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    const result = await db.query(
      `UPDATE membership_categories SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        fee_kobo = COALESCE($3, fee_kobo),
        min_experience_years = COALESCE($4, min_experience_years),
        sort_order = COALESCE($5, sort_order),
        is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING id, name, description, fee_kobo, min_experience_years, sort_order, is_active`,
      [name || null, description ?? null, fee_kobo || null, min_experience_years ?? null, sort_order ?? null, is_active ?? null, id]
    );
    return res.json({ category: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A category with this name already exists." });
    }
    console.error("Error updating category:", err);
    return res.status(500).json({ error: "Failed to update category." });
  }
});

// ─── DELETE /api/admin/settings/categories/:id ───────────────────────────
adminSettingsRouter.delete("/admin/settings/categories/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDbPool();

    const existing = await db.query("SELECT id, name FROM membership_categories WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    // Soft-delete: set is_active = FALSE instead of deleting
    await db.query("UPDATE membership_categories SET is_active = FALSE WHERE id = $1", [id]);
    return res.json({ message: `Category "${existing.rows[0].name}" deactivated.` });
  } catch (err) {
    console.error("Error deactivating category:", err);
    return res.status(500).json({ error: "Failed to deactivate category." });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/settings/email-templates ─────────────────────────────
adminSettingsRouter.get("/admin/settings/email-templates", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      "SELECT id, name, subject, body, variables, created_at, updated_at FROM email_templates ORDER BY name"
    );
    return res.json({ templates: result.rows });
  } catch (err) {
    console.error("Error fetching email templates:", err);
    return res.status(500).json({ error: "Failed to fetch email templates." });
  }
});

// ─── POST /api/admin/settings/email-templates ────────────────────────────
adminSettingsRouter.post("/admin/settings/email-templates", async (req: Request, res: Response) => {
  try {
    const { name, subject, body, variables } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: "Name, subject, and body are required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO email_templates (name, subject, body, variables)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, subject, body, variables, created_at, updated_at`,
      [name.trim(), subject.trim(), body, variables || []]
    );
    return res.status(201).json({ template: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A template with this name already exists." });
    }
    console.error("Error creating template:", err);
    return res.status(500).json({ error: "Failed to create template." });
  }
});

// ─── PUT /api/admin/settings/email-templates/:id ─────────────────────────
adminSettingsRouter.put("/admin/settings/email-templates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, subject, body, variables } = req.body;

    const db = getDbPool();
    const existing = await db.query("SELECT id FROM email_templates WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Email template not found." });
    }

    const result = await db.query(
      `UPDATE email_templates SET
        name = COALESCE($1, name),
        subject = COALESCE($2, subject),
        body = COALESCE($3, body),
        variables = COALESCE($4, variables)
       WHERE id = $5
       RETURNING id, name, subject, body, variables, created_at, updated_at`,
      [name || null, subject || null, body || null, variables || null, id]
    );
    return res.json({ template: result.rows[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A template with this name already exists." });
    }
    console.error("Error updating template:", err);
    return res.status(500).json({ error: "Failed to update template." });
  }
});

// ─── DELETE /api/admin/settings/email-templates/:id ──────────────────────
adminSettingsRouter.delete("/admin/settings/email-templates/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDbPool();
    const existing = await db.query("SELECT id, name FROM email_templates WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Email template not found." });
    }
    await db.query("DELETE FROM email_templates WHERE id = $1", [id]);
    return res.json({ message: `Template "${existing.rows[0].name}" deleted.` });
  } catch (err) {
    console.error("Error deleting template:", err);
    return res.status(500).json({ error: "Failed to delete template." });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ADMIN USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════

// ─── GET /api/admin/settings/admins ──────────────────────────────────────
adminSettingsRouter.get("/admin/settings/admins", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT
        id, first_name, last_name, email, is_admin, is_verified, created_at
       FROM users
       WHERE is_admin = TRUE
       ORDER BY created_at ASC`
    );
    const admins = result.rows.map((u: any) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      role: "Admin",
      isVerified: u.is_verified,
      createdAt: u.created_at,
    }));
    return res.json({ admins });
  } catch (err) {
    console.error("Error fetching admins:", err);
    return res.status(500).json({ error: "Failed to fetch admin users." });
  }
});

// ─── POST /api/admin/settings/admins ─────────────────────────────────────
adminSettingsRouter.post("/admin/settings/admins", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const db = getDbPool();
    const existing = await db.query("SELECT id, first_name, last_name, email, is_admin FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "No user found with this email." });
    }
    if (existing.rows[0].is_admin) {
      return res.status(409).json({ error: "This user is already an admin." });
    }

    await db.query("UPDATE users SET is_admin = TRUE WHERE id = $1", [existing.rows[0].id]);
    const u = existing.rows[0];
    return res.json({
      message: `${u.first_name} ${u.last_name} has been granted admin access.`,
      admin: { id: u.id, name: `${u.first_name} ${u.last_name}`, email: u.email, role: "Admin", isVerified: true, createdAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error("Error adding admin:", err);
    return res.status(500).json({ error: "Failed to add admin." });
  }
});

// ─── DELETE /api/admin/settings/admins/:id ────────────────────────────────
adminSettingsRouter.delete("/admin/settings/admins/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDbPool();

    const existing = await db.query("SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND is_admin = TRUE", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found." });
    }

    await db.query("UPDATE users SET is_admin = FALSE WHERE id = $1", [id]);
    const u = existing.rows[0];
    return res.json({ message: `Admin access revoked for ${u.first_name} ${u.last_name}.` });
  } catch (err) {
    console.error("Error removing admin:", err);
    return res.status(500).json({ error: "Failed to remove admin." });
  }
});
