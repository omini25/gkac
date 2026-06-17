import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db";

export const adminProfileRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";
const SALT_ROUNDS = 12;

// Helper to extract userId from JWT
function getUserId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return payload.userId;
  } catch {
    return null;
  }
}

// ─── GET /api/admin/profile ──────────────────────────────────────────────
adminProfileRouter.get("/admin/profile", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required." });

    const db = getDbPool();
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, date_of_birth, gender,
              state_of_origin, lga, residential_address,
              membership_category_name, membership_code, application_status,
              is_verified, is_admin, membership_expires_at, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const u = result.rows[0];
    return res.json({
      profile: {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        dateOfBirth: u.date_of_birth,
        gender: u.gender,
        stateOfOrigin: u.state_of_origin,
        lga: u.lga,
        residentialAddress: u.residential_address,
        membershipCategory: u.membership_category_name,
        membershipCode: u.membership_code,
        applicationStatus: u.application_status,
        isVerified: u.is_verified,
        isAdmin: u.is_admin,
        membershipExpiresAt: u.membership_expires_at,
        createdAt: u.created_at,
      },
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    return res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// ─── PUT /api/admin/profile ──────────────────────────────────────────────
adminProfileRouter.put("/admin/profile", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required." });

    const { firstName, lastName, email, phone } = req.body;

    const db = getDbPool();

    // If changing email, check it's not taken
    if (email) {
      const existing = await db.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email.toLowerCase().trim(), userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email is already in use." });
      }
    }

    const result = await db.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone)
       WHERE id = $5
       RETURNING id, first_name, last_name, email, phone`,
      [
        firstName || null,
        lastName || null,
        email ? email.toLowerCase().trim() : null,
        phone || null,
        userId,
      ]
    );

    const u = result.rows[0];
    return res.json({
      message: "Profile updated successfully.",
      profile: {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    return res.status(500).json({ error: "Failed to update profile." });
  }
});

// ─── PUT /api/admin/profile/password ──────────────────────────────────────
adminProfileRouter.put("/admin/profile/password", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required." });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required." });
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: "New password must be at least 8 characters with a number and a letter." });
    }

    const db = getDbPool();
    const userResult = await db.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!valid) {
      return res.status(403).json({ error: "Current password is incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, userId]);

    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Error changing password:", err);
    return res.status(500).json({ error: "Failed to change password." });
  }
});
