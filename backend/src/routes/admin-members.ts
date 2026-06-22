import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDbPool } from "../db";
import { EmailTemplates, sendTemplatedEmail } from "../email";

export const adminMembersRouter = Router();

// ─── POST /api/admin/members ───────────────────────────────────────────────
adminMembersRouter.post("/admin/members", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const {
      firstName, lastName, email, phone, password,
      gender, stateOfOrigin, lga, residentialAddress,
      categoryId, categoryName, membershipCode,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "First name, last name, email, and password are required." });
    }

    // Check for duplicate email
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash,
        gender, state_of_origin, lga, residential_address,
        membership_category_id, membership_category_name,
        membership_code, application_status, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'approved',TRUE)
       RETURNING id, first_name, last_name, email, phone,
         membership_category_name, membership_code, application_status,
         is_suspended, membership_expires_at, created_at`,
      [
        firstName.trim(), lastName.trim(), email.trim().toLowerCase(), phone || null,
        passwordHash, gender || null, stateOfOrigin || null, lga || null,
        residentialAddress || null, categoryId || null, categoryName || null,
        membershipCode || null,
      ]
    );

    const u = result.rows[0];
    return res.status(201).json({
      message: "Member created successfully.",
      member: {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        category: u.membership_category_name,
        mno: u.membership_code || "—",
        applicationStatus: u.application_status,
        isSuspended: u.is_suspended,
        expiry: u.membership_expires_at,
        status: "Active",
        createdAt: u.created_at,
      },
    });
  } catch (err) {
    console.error("Error creating member:", err);
    return res.status(500).json({ error: "Failed to create member." });
  }
});

// ─── GET /api/admin/members/:id/payments ────────────────────────────────────
adminMembersRouter.get("/admin/members/:id/payments", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, amount_kobo, currency, reference, status, payment_type,
              proof_of_payment_url, paid_at, created_at
       FROM payments
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );
    return res.json({ payments: result.rows });
  } catch (err) {
    console.error("Error fetching member payments:", err);
    return res.status(500).json({ error: "Failed to fetch payment history." });
  }
});

// ─── GET /api/admin/members ───────────────────────────────────────────────
adminMembersRouter.get("/admin/members", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT
        id, first_name, last_name, email, phone, date_of_birth, gender,
        state_of_origin, lga, residential_address,
        membership_category_id, membership_category_name,
        membership_code, application_status, rejection_reason,
        is_verified, is_admin, is_suspended, membership_expires_at,
        created_at, updated_at
       FROM users
       WHERE is_admin = FALSE
       ORDER BY created_at DESC`
    );

    const members = result.rows.map((u: any) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      phone: u.phone,
      dateOfBirth: u.date_of_birth,
      gender: u.gender,
      stateOfOrigin: u.state_of_origin,
      lga: u.lga,
      residentialAddress: u.residential_address,
      membershipCategoryId: u.membership_category_id,
      category: u.membership_category_name,
      mno: u.membership_code || "—",
      applicationStatus: u.application_status,
      rejectionReason: u.rejection_reason,
      isVerified: u.is_verified,
      isAdmin: u.is_admin,
      isSuspended: u.is_suspended,
      expiry: u.membership_expires_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      // Computed display status
      status: computeDisplayStatus(u),
    }));

    return res.json({ members });
  } catch (err) {
    console.error("Error fetching members:", err);
    return res.status(500).json({ error: "Failed to fetch members." });
  }
});

function computeDisplayStatus(u: any): string {
  if (u.is_suspended) return "Suspended";
  if (u.application_status === "pending_payment" || u.application_status === "pending_approval") return "Pending";
  if (u.application_status === "rejected") return "Rejected";
  if (u.application_status === "approved") {
    if (!u.membership_expires_at || new Date(u.membership_expires_at) <= new Date()) {
      return "Expired";
    }
    return "Active";
  }
  return u.application_status;
}

// ─── GET /api/admin/members/:id ───────────────────────────────────────────
adminMembersRouter.get("/admin/members/:id", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT
        id, first_name, last_name, email, phone, date_of_birth, gender,
        state_of_origin, lga, residential_address,
        membership_category_id, membership_category_name,
        membership_code, application_status, rejection_reason,
        is_verified, is_admin, is_suspended, membership_expires_at,
        annual_due_paid, annual_due_year,
        annual_developmental_fee_paid, annual_developmental_fee_year,
        developmental_levy_amount,
        created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const u = result.rows[0];
    return res.json({
      member: {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        dateOfBirth: u.date_of_birth,
        gender: u.gender,
        stateOfOrigin: u.state_of_origin,
        lga: u.lga,
        residentialAddress: u.residential_address,
        membershipCategoryId: u.membership_category_id,
        category: u.membership_category_name,
        mno: u.membership_code || "—",
        applicationStatus: u.application_status,
        rejectionReason: u.rejection_reason,
        isVerified: u.is_verified,
        isAdmin: u.is_admin,
        isSuspended: u.is_suspended,
        expiry: u.membership_expires_at,
        annualDuePaid: u.annual_due_paid ?? false,
        annualDueYear: u.annual_due_year,
        annualDevelopmentalFeePaid: u.annual_developmental_fee_paid ?? false,
        annualDevelopmentalFeeYear: u.annual_developmental_fee_year,
        developmentalLevyAmount: u.developmental_levy_amount,
        status: computeDisplayStatus(u),
      },
    });
  } catch (err) {
    console.error("Error fetching member:", err);
    return res.status(500).json({ error: "Failed to fetch member." });
  }
});

// ─── PUT /api/admin/members/:id ───────────────────────────────────────────
adminMembersRouter.put("/admin/members/:id", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const {
      firstName, lastName, email, phone, dateOfBirth, gender,
      stateOfOrigin, lga, residentialAddress,
      membershipCategoryId, membershipCategoryName,
      membershipCode, membershipExpiresAt,
    } = req.body;

    // Check member exists
    const existing = await db.query("SELECT id FROM users WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const result = await db.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        state_of_origin = COALESCE($7, state_of_origin),
        lga = COALESCE($8, lga),
        residential_address = COALESCE($9, residential_address),
        membership_category_id = COALESCE($10, membership_category_id),
        membership_category_name = COALESCE($11, membership_category_name),
        membership_code = COALESCE($12, membership_code),
        membership_expires_at = COALESCE($13, membership_expires_at)
       WHERE id = $14
       RETURNING id, first_name, last_name, email, phone,
         membership_category_name, membership_code, application_status,
         is_suspended, membership_expires_at`,
      [
        firstName || null, lastName || null, email || null, phone || null,
        dateOfBirth || null, gender || null, stateOfOrigin || null,
        lga || null, residentialAddress || null,
        membershipCategoryId || null, membershipCategoryName || null,
        membershipCode || null, membershipExpiresAt || null,
        id,
      ]
    );

    const u = result.rows[0];
    return res.json({
      message: "Member updated successfully.",
      member: {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        phone: u.phone,
        category: u.membership_category_name,
        mno: u.membership_code || "—",
        status: computeDisplayStatus(u),
        expiry: u.membership_expires_at,
      },
    });
  } catch (err) {
    console.error("Error updating member:", err);
    return res.status(500).json({ error: "Failed to update member." });
  }
});

// ─── PUT /api/admin/members/:id/approve ───────────────────────────────────
adminMembersRouter.put("/admin/members/:id/approve", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { membershipCode, notes } = req.body;

    const existing = await db.query(
      "SELECT id, application_status, membership_code FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    if (user.application_status !== "pending_approval" && user.application_status !== "pending_payment") {
      return res.status(400).json({ error: "Only pending applications can be approved." });
    }

    // Generate membership code if not provided
    const code = membershipCode || user.membership_code || (() => {
      const year = new Date().getFullYear();
      const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
      return `MEM-${year}-${random}`;
    })();

    // Set membership expiry if not already set
    let expiresAt = null;
    const expiryResult = await db.query("SELECT membership_expires_at FROM users WHERE id = $1", [id]);
    if (!expiryResult.rows[0].membership_expires_at) {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    const result = await db.query(
      `UPDATE users SET
        application_status = 'approved',
        is_verified = TRUE,
        is_suspended = FALSE,
        membership_code = $1,
        membership_expires_at = COALESCE($2, membership_expires_at)
       WHERE id = $3
       RETURNING id, first_name, last_name, email, membership_code,
         membership_category_name, application_status, is_suspended,
         membership_expires_at`,
      [code, expiresAt, id]
    );

    const u = result.rows[0];
    console.log(`[ADMIN] Member ${u.first_name} ${u.last_name} (${u.email}) approved.${notes ? ` Notes: ${notes}` : ""}`);

    // Send approval email
    const fullName = `${u.first_name} ${u.last_name}`;
    sendTemplatedEmail(
      { address: u.email, name: fullName },
      EmailTemplates.approved(fullName, u.membership_code),
    );

    return res.json({
      message: "Member approved successfully.",
      member: {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        mno: u.membership_code,
        category: u.membership_category_name,
        status: "Active",
        expiry: u.membership_expires_at,
      },
    });
  } catch (err) {
    console.error("Error approving member:", err);
    return res.status(500).json({ error: "Failed to approve member." });
  }
});

// ─── PUT /api/admin/members/:id/reject ────────────────────────────────────
adminMembersRouter.put("/admin/members/:id/reject", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Rejection reason is required." });
    }

    const existing = await db.query(
      "SELECT id, application_status FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    if (user.application_status === "approved") {
      return res.status(400).json({ error: "Cannot reject an already approved member." });
    }

    const result = await db.query(
      `UPDATE users SET
        application_status = 'rejected',
        rejection_reason = $1
       WHERE id = $2
       RETURNING id, first_name, last_name, email, application_status`,
      [reason.trim(), id]
    );

    const u = result.rows[0];
    console.log(`[ADMIN] Member ${u.first_name} ${u.last_name} (${u.email}) rejected. Reason: ${reason}`);

    // Send rejection email
    const fullName = `${u.first_name} ${u.last_name}`;
    sendTemplatedEmail(
      { address: u.email, name: fullName },
      EmailTemplates.rejected(fullName, reason.trim()),
    );

    return res.json({
      message: "Member rejected. Notification will be sent.",
      member: {
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        status: "Rejected",
      },
    });
  } catch (err) {
    console.error("Error rejecting member:", err);
    return res.status(500).json({ error: "Failed to reject member." });
  }
});

// ─── PUT /api/admin/members/:id/suspend ───────────────────────────────────
adminMembersRouter.put("/admin/members/:id/suspend", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const existing = await db.query(
      "SELECT id, first_name, last_name, email, application_status, is_suspended FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    if (user.is_suspended) {
      return res.status(400).json({ error: "Member is already suspended." });
    }
    if (user.application_status !== "approved") {
      return res.status(400).json({ error: "Only approved members can be suspended." });
    }

    await db.query(
      "UPDATE users SET is_suspended = TRUE WHERE id = $1",
      [id]
    );

    // Send suspension email
    const fullName = `${user.first_name} ${user.last_name}`;
    sendTemplatedEmail(
      { address: user.email, name: fullName },
      EmailTemplates.suspended(fullName),
    );

    return res.json({ message: "Member suspended successfully." });
  } catch (err) {
    console.error("Error suspending member:", err);
    return res.status(500).json({ error: "Failed to suspend member." });
  }
});

// ─── PUT /api/admin/members/:id/reinstate ─────────────────────────────────
adminMembersRouter.put("/admin/members/:id/reinstate", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const existing = await db.query(
      "SELECT id, first_name, last_name, email, application_status, is_suspended FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    if (!user.is_suspended) {
      return res.status(400).json({ error: "Member is not currently suspended." });
    }

    await db.query(
      "UPDATE users SET is_suspended = FALSE WHERE id = $1",
      [id]
    );

    // Send reinstatement email
    const fullName = `${user.first_name} ${user.last_name}`;
    sendTemplatedEmail(
      { address: user.email, name: fullName },
      EmailTemplates.reinstated(fullName),
    );

    return res.json({ message: "Member reinstated successfully." });
  } catch (err) {
    console.error("Error reinstating member:", err);
    return res.status(500).json({ error: "Failed to reinstate member." });
  }
});

// ─── PUT /api/admin/members/:id/dues ──────────────────────────────────────
// Admin marks a member's annual due and/or developmental fee as paid
adminMembersRouter.put("/admin/members/:id/dues", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { markAnnualDue, markDevelopmentalFee, developmentalAmount } = req.body;

    const existing = await db.query(
      "SELECT id, first_name, last_name, email, annual_due_paid, annual_developmental_fee_paid FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    const currentYear = new Date().getFullYear();
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (markAnnualDue && !user.annual_due_paid) {
      updates.push(`annual_due_paid = TRUE, annual_due_year = $${paramIndex++}`);
      params.push(currentYear);
    }

    if (markDevelopmentalFee && !user.annual_developmental_fee_paid) {
      updates.push(`annual_developmental_fee_paid = TRUE, annual_developmental_fee_year = $${paramIndex++}`);
      params.push(currentYear);
      if (developmentalAmount) {
        updates.push(`developmental_levy_amount = $${paramIndex++}`);
        params.push(developmentalAmount);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No dues to mark as paid or already marked." });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      params
    );

    const fullName = `${user.first_name} ${user.last_name}`;
    console.log(`[ADMIN] Dues confirmed for ${fullName} (${user.email})`);

    return res.json({
      message: "Dues marked as paid successfully.",
      memberId: id,
    });
  } catch (err) {
    console.error("Error updating dues:", err);
    return res.status(500).json({ error: "Failed to update dues." });
  }
});

// ─── DELETE /api/admin/members/:id ──────────────────────────────────────
adminMembersRouter.delete("/admin/members/:id", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const existing = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = existing.rows[0];
    const fullName = `${user.first_name} ${user.last_name}`;

    // Delete related records first (order matters for FK constraints)
    await db.query("DELETE FROM election_votes WHERE voter_id = $1", [id]);
    await db.query("DELETE FROM election_candidates WHERE user_id = $1", [id]);
    await db.query("DELETE FROM election_declarations WHERE user_id = $1", [id]);
    await db.query("DELETE FROM payments WHERE user_id = $1", [id]);
    await db.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [id]);

    // Delete the user
    await db.query("DELETE FROM users WHERE id = $1", [id]);

    console.log(`[ADMIN] Member ${fullName} (${user.email}) deleted by admin.`);

    return res.json({ message: `Member ${fullName} deleted successfully.` });
  } catch (err) {
    console.error("Error deleting member:", err);
    return res.status(500).json({ error: "Failed to delete member." });
  }
});

// ─── POST /api/admin/members/:id/send-reset-password ─────────────────────
adminMembersRouter.post("/admin/members/:id/send-reset-password", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const userResult = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1",
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = userResult.rows[0];

    // Invalidate old tokens
    await db.query(
      "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
      [user.id]
    );

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, resetToken, expiresAt]
    );

    const fullName = `${user.first_name} ${user.last_name}`;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    sendTemplatedEmail(
      { address: user.email, name: fullName },
      EmailTemplates.passwordReset(fullName, resetLink),
    );

    console.log(`[ADMIN] Password reset email sent to ${fullName} (${user.email}) by admin.`);

    return res.json({ message: `Password reset email sent to ${fullName}.` });
  } catch (err) {
    console.error("Error sending admin password reset:", err);
    return res.status(500).json({ error: "Failed to send password reset email." });
  }
});

// ─── POST /api/admin/members/:id/force-reset-password ────────────────────
adminMembersRouter.post("/admin/members/:id/force-reset-password", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters with a number and a letter.",
      });
    }

    const userResult = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id = $1",
      [id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.query(
      "UPDATE users SET password_hash = $1, force_password_change = TRUE WHERE id = $2",
      [passwordHash, id]
    );

    const fullName = `${user.first_name} ${user.last_name}`;
    console.log(`[ADMIN] Password force-reset for ${fullName} (${user.email}) by admin.`);

    return res.json({ message: `Password for ${fullName} has been reset. The member will be prompted to change it on next login.` });
  } catch (err) {
    console.error("Error force resetting password:", err);
    return res.status(500).json({ error: "Failed to reset password." });
  }
});

// ─── POST /api/admin/members/:id/remind ───────────────────────────────────
adminMembersRouter.post("/admin/members/:id/remind", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const result = await db.query(
      "SELECT id, first_name, last_name, email, membership_code, membership_expires_at FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Member not found." });
    }

    const u = result.rows[0];
    const fullName = `${u.first_name} ${u.last_name}`;
    const expiryDate = u.membership_expires_at
      ? new Date(u.membership_expires_at).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";

    // Send renewal reminder email
    sendTemplatedEmail(
      { address: u.email, name: fullName },
      EmailTemplates.renewalReminder(fullName, u.membership_code || "N/A", expiryDate),
    );

    console.log(`[ADMIN] Renewal reminder sent to ${fullName} (${u.email})`);

    return res.json({
      message: `Renewal reminder sent to ${fullName}.`,
    });
  } catch (err) {
    console.error("Error sending reminder:", err);
    return res.status(500).json({ error: "Failed to send reminder." });
  }
});
