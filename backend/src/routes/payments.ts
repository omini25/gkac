import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db";
import { EmailTemplates, sendTemplatedEmail } from "../email";

export const paymentsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";

// ─── Auth helper ───────────────────────────────────────────────────────────
function getAuthUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const proofStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `proof-${crypto.randomBytes(12).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Only JPG, PNG, GIF, WebP, and PDF files are allowed."));
  },
});

// ─── Bank account details (configurable via env) ──────────────────────────
const BANK_DETAILS = {
  bankName: process.env.BANK_NAME || "First Bank of Nigeria",
  accountName: process.env.BANK_ACCOUNT_NAME || "Global Kegite Archaverians Club",
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || "2034156789",
  sortCode: process.env.BANK_SORT_CODE || "011-151-678",
  referencePrefix: "GKAC-REG",
};

// ─── GET /api/payments/bank-details ───────────────────────────────────────
paymentsRouter.get("/payments/bank-details", (_req: Request, res: Response) => {
  return res.json({ bankDetails: BANK_DETAILS });
});

// ─── POST /api/payments/initialize ────────────────────────────────────────
// Creates a pending payment record (no gateway call — bank transfer flow)
paymentsRouter.post("/payments/initialize", async (req: Request, res: Response) => {
  try {
    const { userId, amountKobo, email, paymentType = "registration" } = req.body;

    if (!userId || !amountKobo || !email) {
      return res.status(400).json({ error: "userId, amountKobo, and email are required." });
    }

    const reference = `GK-${paymentType.toUpperCase()}-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const db = getDbPool();

    const result = await db.query(
      `INSERT INTO payments (user_id, amount_kobo, reference, payment_type, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, reference`,
      [userId, amountKobo, reference, paymentType]
    );

    const payment = result.rows[0];

    return res.json({
      paymentId: payment.id,
      reference: payment.reference,
      bankDetails: BANK_DETAILS,
    });
  } catch (err) {
    console.error("Payment initialize error:", err);
    return res.status(500).json({ error: "Failed to initialize payment." });
  }
});

// ─── POST /api/payments/upload-proof ──────────────────────────────────────
// Uploads proof of bank transfer and moves application to pending_approval
paymentsRouter.post("/payments/upload-proof", proofUpload.single("proof"), async (req: Request, res: Response) => {
  try {
    const { userId, paymentId } = req.body;

    if (!userId || !paymentId) {
      return res.status(400).json({ error: "userId and paymentId are required." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No proof of payment file uploaded." });
    }

    const proofUrl = `/uploads/${req.file.filename}`;
    const db = getDbPool();

    // Update payment record with proof URL and set status to awaiting_verification
    const paymentResult = await db.query(
      `UPDATE payments
       SET proof_of_payment_url = $1,
           status = 'awaiting_verification',
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, reference, amount_kobo, payment_type`,
      [proofUrl, paymentId, userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    const payment = paymentResult.rows[0];

    if (payment.payment_type === "renewal") {
      // For renewals: just mark the payment, don't change membership code or app status
      // Membership expiry will be extended when admin approves
      const userInfo = await db.query(
        "SELECT first_name, last_name FROM users WHERE id = $1",
        [userId],
      );
      if (userInfo.rows.length > 0) {
        const fullName = `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`;
        sendTemplatedEmail(
          { address: req.body.email || "", name: fullName },
          EmailTemplates.paymentReceived(fullName, payment.reference),
        );
      }

      return res.json({
        message: "Renewal proof uploaded successfully. Your renewal is pending admin review.",
        payment: {
          id: payment.id,
          reference: payment.reference,
          amountKobo: payment.amount_kobo,
          proofUrl,
          status: "awaiting_verification",
        },
      });
    }

    // For registration: generate membership code + move to pending_approval
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const membershipCode = `MEM-${year}-${random}`;

    // Calculate expiry: 12 months from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Update user: move to pending_approval + assign membership code
    await db.query(
      `UPDATE users SET
        membership_code = $1,
        membership_expires_at = $2,
        application_status = 'pending_approval',
        updated_at = NOW()
       WHERE id = $3`,
      [membershipCode, expiresAt, userId]
    );

    // Send payment confirmation email (fire-and-forget)
    const userInfo = await db.query(
      "SELECT first_name, last_name FROM users WHERE id = $1",
      [userId],
    );
    if (userInfo.rows.length > 0) {
      const fullName = `${userInfo.rows[0].first_name} ${userInfo.rows[0].last_name}`;
      sendTemplatedEmail(
        { address: req.body.email || "", name: fullName },
        EmailTemplates.paymentReceived(fullName, payment.reference),
      );
    }

    return res.json({
      message: "Proof of payment uploaded successfully. Your application is now pending admin review.",
      payment: {
        id: payment.id,
        reference: payment.reference,
        amountKobo: payment.amount_kobo,
        proofUrl,
        status: "awaiting_verification",
      },
      membershipCode,
    });
  } catch (err) {
    console.error("Proof upload error:", err);
    return res.status(500).json({ error: "Failed to upload proof of payment." });
  }
});

// ─── GET /api/payments/verify?reference=XXX ────────────────────────────────
// Returns the status of a payment (used to check after upload)
paymentsRouter.get("/payments/verify", async (req: Request, res: Response) => {
  try {
    const reference = req.query.reference as string;
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required." });
    }

    const db = getDbPool();
    const result = await db.query(
      "SELECT id, reference, amount_kobo, status, proof_of_payment_url, payment_type, created_at FROM payments WHERE reference = $1",
      [reference]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found." });
    }

    const payment = result.rows[0];

    return res.json({
      status: payment.status,
      message: payment.status === "awaiting_verification"
        ? "Your proof of payment has been received and is pending admin review."
        : payment.status === "success"
          ? "Payment confirmed."
          : "Payment is still pending.",
      payment: {
        id: payment.id,
        reference: payment.reference,
        amountKobo: payment.amount_kobo,
        status: payment.status,
        proofUrl: payment.proof_of_payment_url,
        paymentType: payment.payment_type,
        createdAt: payment.created_at,
      },
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    return res.status(500).json({ error: "Failed to verify payment." });
  }
});

// ─── GET /api/payments/history ─────────────────────────────────────────
// Returns all payment records for the authenticated member
paymentsRouter.get("/payments/history", async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `SELECT id, amount_kobo, currency, reference, status, payment_type,
              proof_of_payment_url, paid_at, created_at, updated_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ payments: result.rows });
  } catch (err) {
    console.error("Payment history error:", err);
    return res.status(500).json({ error: "Failed to fetch payment history." });
  }
});

// ─── POST /api/payments/renew ──────────────────────────────────────────
// Initiates a membership renewal payment
paymentsRouter.post("/payments/renew", async (req: Request, res: Response) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const { amountKobo, email } = req.body;
    if (!amountKobo || !email) {
      return res.status(400).json({ error: "amountKobo and email are required." });
    }

    const reference = `GK-RENEWAL-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const db = getDbPool();

    const result = await db.query(
      `INSERT INTO payments (user_id, amount_kobo, reference, payment_type, status)
       VALUES ($1, $2, $3, 'renewal', 'pending')
       RETURNING id, reference`,
      [userId, amountKobo, reference]
    );

    const payment = result.rows[0];

    return res.json({
      paymentId: payment.id,
      reference: payment.reference,
      bankDetails: BANK_DETAILS,
    });
  } catch (err) {
    console.error("Renewal payment error:", err);
    return res.status(500).json({ error: "Failed to initiate renewal payment." });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  ADMIN PAYMENT ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/payments/admin/all ───────────────────────────────────────────
paymentsRouter.get("/payments/admin/all", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Count total
    const countResult = await db.query("SELECT COUNT(*)::bigint AS total FROM payments");
    const total = parseInt(countResult.rows[0].total, 10) || 0;

    const result = await db.query(
      `SELECT p.id, p.amount_kobo, p.reference, p.status, p.payment_type,
              p.proof_of_payment_url, p.paid_at, p.created_at,
              u.id AS user_id, u.first_name, u.last_name, u.email,
              u.membership_code, u.membership_category_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const payments = result.rows.map((r: any) => ({
      id: r.id,
      amountKobo: r.amount_kobo,
      reference: r.reference,
      status: r.status,
      paymentType: r.payment_type,
      proofUrl: r.proof_of_payment_url,
      paidAt: r.paid_at,
      createdAt: r.created_at,
      member: {
        id: r.user_id,
        name: r.first_name ? `${r.first_name} ${r.last_name}` : "Unknown",
        email: r.email || "—",
        membershipCode: r.membership_code || "—",
        category: r.membership_category_name || "—",
      },
    }));
    return res.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Admin payments error:", err);
    return res.status(500).json({ error: "Failed to fetch payments." });
  }
});

// ─── GET /api/payments/admin/stats ─────────────────────────────────────────
paymentsRouter.get("/payments/admin/stats", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);

    const result = await db.query(
      `SELECT
         (SELECT COALESCE(SUM(amount_kobo), 0)::bigint FROM payments
          WHERE status = 'confirmed' AND created_at >= $1) AS total_collected,
         (SELECT COALESCE(SUM(amount_kobo), 0)::bigint FROM payments
          WHERE status IN ('pending','awaiting_verification')) AS pending_total,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE status IN ('pending','awaiting_verification')) AS pending_count,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE status = 'awaiting_verification') AS awaiting_count,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments WHERE status = 'confirmed') AS total_confirmed,
         (SELECT COALESCE(SUM(amount_kobo), 0)::bigint FROM payments WHERE status = 'confirmed') AS lifetime_collected,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM users
          WHERE is_admin = FALSE AND is_suspended = FALSE
          AND application_status = 'approved'
          AND membership_expires_at IS NOT NULL
          AND membership_expires_at <= $2) AS renewals_due,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM users
          WHERE is_admin = FALSE AND is_suspended = FALSE
          AND application_status = 'approved'
          AND membership_expires_at IS NOT NULL
          AND membership_expires_at > $3
          AND membership_expires_at <= $4) AS upcoming_renewals,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE created_at >= $1) AS total_payments,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE status = 'confirmed' AND created_at >= $1) AS confirmed_payments,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE payment_type = 'registration' AND status = 'confirmed') AS total_registrations,
         (SELECT COALESCE(COUNT(*), 0)::bigint FROM payments
          WHERE payment_type = 'renewal' AND status = 'confirmed') AS total_renewals
      `,
      [yearStart, thirtyDaysFromNow, today, sixtyDaysFromNow]
    );

    const r = result.rows[0];
    const totalCollected = parseInt(r.total_collected, 10) || 0;
    const pendingTotal = parseInt(r.pending_total, 10) || 0;
    const pendingCount = parseInt(r.pending_count, 10) || 0;
    const awaitingCount = parseInt(r.awaiting_count, 10) || 0;
    const totalConfirmed = parseInt(r.total_confirmed, 10) || 0;
    const lifetimeCollected = parseInt(r.lifetime_collected, 10) || 0;
    const renewalsDue = parseInt(r.renewals_due, 10) || 0;
    const upcomingRenewals = parseInt(r.upcoming_renewals, 10) || 0;
    const totalPayments = parseInt(r.total_payments, 10) || 0;
    const confirmed = parseInt(r.confirmed_payments, 10) || 0;
    const totalRegistrations = parseInt(r.total_registrations, 10) || 0;
    const totalRenewals = parseInt(r.total_renewals, 10) || 0;
    const collectionRate = totalPayments > 0 ? Math.round((confirmed / totalPayments) * 100) : 0;

    return res.json({
      stats: {
        totalCollected,
        renewalsDue,
        pendingTotal,
        pendingCount,
        awaitingCount,
        totalConfirmed,
        lifetimeCollected,
        upcomingRenewals,
        collectionRate,
        totalRegistrations,
        totalRenewals,
        totalPaymentsThisYear: totalPayments,
      },
    });
  } catch (err) {
    console.error("Admin payment stats error:", err);
    return res.status(500).json({ error: "Failed to fetch payment stats." });
  }
});

// ─── PUT /api/payments/admin/:id/confirm ───────────────────────────────────
paymentsRouter.put("/payments/admin/:id/confirm", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const existing = await db.query("SELECT id, status, user_id, payment_type FROM payments WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Payment not found." });
    if (existing.rows[0].status === "confirmed") return res.status(400).json({ error: "Payment already confirmed." });

    const payment = existing.rows[0];

    await db.query(
      `UPDATE payments SET status = 'confirmed', paid_at = NOW() WHERE id = $1`,
      [id]
    );

    // If this is a renewal payment, extend membership by 1 year
    if (payment.payment_type === "renewal") {
      await db.query(
        `UPDATE users SET
          membership_expires_at = COALESCE(membership_expires_at, NOW()) + INTERVAL '1 year'
         WHERE id = $1`,
        [payment.user_id]
      );
    }

    return res.json({ message: "Payment confirmed successfully." });
  } catch (err) {
    console.error("Confirm payment error:", err);
    return res.status(500).json({ error: "Failed to confirm payment." });
  }
});

// ─── PUT /api/payments/admin/:id/reject ────────────────────────────────────
paymentsRouter.put("/payments/admin/:id/reject", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const existing = await db.query("SELECT id, status FROM payments WHERE id = $1", [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Payment not found." });
    if (existing.rows[0].status === "confirmed") return res.status(400).json({ error: "Cannot reject an already confirmed payment." });

    await db.query(
      `UPDATE payments SET status = 'failed' WHERE id = $1`,
      [id]
    );

    return res.json({ message: "Payment rejected." });
  } catch (err) {
    console.error("Reject payment error:", err);
    return res.status(500).json({ error: "Failed to reject payment." });
  }
});

// ─── GET /api/payments/admin/renewals-due ──────────────────────────────────
paymentsRouter.get("/payments/admin/renewals-due", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.membership_code, u.membership_category_name,
              u.membership_expires_at,
              COALESCE(
                (SELECT MAX(p.amount_kobo) FROM payments p
                 WHERE p.user_id = u.id AND p.payment_type = 'renewal'
                 AND p.status = 'confirmed'),
                (SELECT fee_kobo FROM membership_categories WHERE name = u.membership_category_name LIMIT 1),
                0
              ) AS expected_amount
       FROM users u
       WHERE u.is_admin = FALSE
         AND u.is_suspended = FALSE
         AND u.application_status = 'approved'
         AND u.membership_expires_at IS NOT NULL
         AND u.membership_expires_at <= $1
       ORDER BY u.membership_expires_at ASC`,
      [thirtyDaysFromNow]
    );

    const members = result.rows.map((r: any) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      email: r.email,
      membershipCode: r.membership_code || "—",
      category: r.membership_category_name || "—",
      expiresAt: r.membership_expires_at,
      expectedAmount: Number(r.expected_amount),
    }));

    return res.json({ members });
  } catch (err) {
    console.error("Renewals due error:", err);
    return res.status(500).json({ error: "Failed to fetch renewals." });
  }
});

// ─── GET /api/payments/admin/upcoming ────────────────────────────────────
paymentsRouter.get("/payments/admin/upcoming", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const now = new Date().toISOString().slice(0, 10);
    const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.membership_code, u.membership_category_name,
              u.membership_expires_at,
              COALESCE(
                (SELECT MAX(p.amount_kobo) FROM payments p
                 WHERE p.user_id = u.id AND p.payment_type = 'renewal'
                 AND p.status = 'confirmed'),
                (SELECT fee_kobo FROM membership_categories WHERE name = u.membership_category_name LIMIT 1),
                0
              ) AS expected_amount
       FROM users u
       WHERE u.is_admin = FALSE
         AND u.is_suspended = FALSE
         AND u.application_status = 'approved'
         AND u.membership_expires_at IS NOT NULL
         AND u.membership_expires_at > $1
         AND u.membership_expires_at <= $2
       ORDER BY u.membership_expires_at ASC`,
      [now, sixtyDaysFromNow]
    );

    const members = result.rows.map((r: any) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      email: r.email,
      membershipCode: r.membership_code || "—",
      category: r.membership_category_name || "—",
      expiresAt: r.membership_expires_at,
      expectedAmount: Number(r.expected_amount),
    }));

    return res.json({ members });
  } catch (err) {
    console.error("Upcoming payments error:", err);
    return res.status(500).json({ error: "Failed to fetch upcoming payments." });
  }
});
