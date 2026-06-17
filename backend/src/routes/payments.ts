import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getDbPool } from "../db";
import { EmailTemplates, sendTemplatedEmail } from "../email";

export const paymentsRouter = Router();

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
       RETURNING id, reference, amount_kobo`,
      [proofUrl, paymentId, userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment record not found." });
    }

    const payment = paymentResult.rows[0];

    // Generate membership code
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
