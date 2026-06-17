import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getDbPool } from "../db";
import { EmailTemplates, sendTemplatedEmail } from "../email";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";
const SALT_ROUNDS = 12;

// ─── GET /api/auth/categories ─────────────────────────────────────────────
authRouter.get("/auth/categories", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      "SELECT id, name, description, fee_kobo, min_experience_years FROM membership_categories WHERE is_active = TRUE ORDER BY sort_order"
    );
    return res.json({ categories: result.rows });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/auth/register ───────────────────────────────────────────────
authRouter.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender,
      stateOfOrigin, lga, residentialAddress,
      hasNIN, nin, altIDType, altIDNum,
      categoryId, referralName,
      password,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ error: "First name, last name, email, phone, and password are required." });
    }
    if (!dateOfBirth || !gender || !stateOfOrigin || !lga || !residentialAddress) {
      return res.status(400).json({ error: "Date of birth, gender, state of origin, LGA, and address are required." });
    }
    if (!categoryId) {
      return res.status(400).json({ error: "Membership category is required." });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Validate password strength
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters with a number and a letter." });
    }

    // Validate NIN
    if (hasNIN && (!nin || !/^\d{11}$/.test(nin))) {
      return res.status(400).json({ error: "Please enter a valid 11-digit NIN." });
    }

    const db = getDbPool();

    // Check if email already exists
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Fetch category fee
    const catResult = await db.query("SELECT name, fee_kobo FROM membership_categories WHERE id = $1", [categoryId]);
    if (catResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid membership category." });
    }
    const category = catResult.rows[0];

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (
        first_name, last_name, email, phone, date_of_birth, gender,
        state_of_origin, lga, residential_address,
        password_hash, membership_category_id, membership_category_name,
        nin, alt_id_type, alt_id_num, referral_name,
        is_verified, application_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id, first_name, last_name, email, application_status`,
      [
        firstName.trim(), lastName.trim(), email.toLowerCase().trim(), phone.trim(),
        dateOfBirth, gender, stateOfOrigin, lga, residentialAddress,
        passwordHash, categoryId, category.name,
        hasNIN ? nin.trim() : null,
        hasNIN ? null : (altIDType || null),
        hasNIN ? null : (altIDNum || null),
        referralName || null,
        hasNIN, // auto-verified if NIN provided
        'pending_payment',
      ]
    );

    const user = result.rows[0];

    // Send welcome email (fire-and-forget)
    const fullName = `${user.first_name} ${user.last_name}`;
    sendTemplatedEmail(
      { address: user.email, name: fullName },
      EmailTemplates.welcome(fullName),
    );

    return res.status(201).json({
      message: "Account created. Please complete payment to proceed.",
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
      feeKobo: category.fee_kobo,
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Internal server error. Please try again later." });
  }
});

// ─── GET /api/auth/verify/:code — Public membership verification ──────────
authRouter.get("/auth/verify/:code", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    if (!code || !code.trim()) {
      return res.status(400).json({ error: "Membership code is required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT
        first_name, last_name, email, phone,
        membership_code, membership_category_name,
        application_status, membership_expires_at
       FROM users
       WHERE membership_code = $1
         AND application_status = 'approved'`,
      [code.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No active member found with that membership number." });
    }

    const u = result.rows[0];
    const now = new Date();
    const expiresAt = u.membership_expires_at ? new Date(u.membership_expires_at) : null;
    const isActive = expiresAt ? expiresAt > now : false;

    return res.json({
      member: {
        name: `${u.first_name} ${u.last_name}`,
        category: u.membership_category_name || "N/A",
        membershipCode: u.membership_code,
        status: isActive ? "active" : "expired",
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).json({ error: "Failed to verify membership." });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
authRouter.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone, password_hash,
              membership_category_name, membership_code, application_status,
              is_verified, is_admin, membership_expires_at,
              passport_photo_url, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "Signed in successfully.",
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        membershipCategory: user.membership_category_name,
        membershipCode: user.membership_code,
        applicationStatus: user.application_status,
        isVerified: user.is_verified,
        isAdmin: user.is_admin,
        membershipExpiresAt: user.membership_expires_at,
        passportPhotoUrl: user.passport_photo_url,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/auth/forgot-password ────────────────────────────────────────
authRouter.post("/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const db = getDbPool();
    const userResult = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);

    // Always return success (don't reveal if account exists)
    if (userResult.rows.length === 0) {
      return res.json({ message: "If an account exists, you will receive a password reset link." });
    }

    const userId = userResult.rows[0].id;

    // Invalidate old tokens
    await db.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [userId]
    );

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [userId, resetToken, expiresAt]
    );

    // Send password reset email
    const userInfo = await db.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [userId],
    );
    const fullName = userInfo.rows.length > 0
      ? `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`
      : "Member";

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    sendTemplatedEmail(
      { address: email.toLowerCase().trim(), name: fullName },
      EmailTemplates.passwordReset(fullName, resetLink),
    );

    console.log(`[email] Password reset link sent to ${email}`);

    return res.json({ message: "If an account exists, you will receive a password reset link." });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/auth/reset-password ─────────────────────────────────────────
authRouter.post("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required." });
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters with a number and a letter." });
    }

    const db = getDbPool();
    const tokenResult = await db.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const resetRecord = tokenResult.rows[0];
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, resetRecord.user_id]);
    await db.query("UPDATE password_reset_tokens SET used = TRUE WHERE id = $1", [resetRecord.id]);

    return res.json({ message: "Password reset successful. You can now sign in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/auth/me — Get current authenticated user ────────────────────
authRouter.get("/auth/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const token = authHeader.slice(7);
    let decoded: { userId: string; email: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    } catch {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT id, first_name, last_name, email, phone,
              membership_category_name, membership_code, application_status,
              is_verified, is_admin, membership_expires_at,
              passport_photo_url, created_at
       FROM users WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const u = result.rows[0];
    return res.json({
      user: {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        membershipCategory: u.membership_category_name,
        membershipCode: u.membership_code,
        applicationStatus: u.application_status,
        isVerified: u.is_verified,
        isAdmin: u.is_admin,
        membershipExpiresAt: u.membership_expires_at,
        passportPhotoUrl: u.passport_photo_url,
        createdAt: u.created_at,
      },
    });
  } catch (err) {
    console.error("Error fetching current user:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});
