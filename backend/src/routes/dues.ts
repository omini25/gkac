import { Router, Request, Response } from "express";
import { getDbPool } from "../db";

export const duesRouter = Router();

// ─── GET /api/dues-directory ───────────────────────────────────────────────
// Public directory of members who have paid dues/developmental fees
duesRouter.get("/dues-directory", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT
        id, first_name AS "firstName", last_name AS "lastName",
        membership_code AS "membershipCode",
        membership_category_name AS "membershipCategory",
        annual_due_paid AS "annualDuePaid", annual_due_year AS "annualDueYear",
        annual_developmental_fee_paid AS "annualDevelopmentalFeePaid",
        annual_developmental_fee_year AS "annualDevelopmentalFeeYear",
        developmental_levy_amount AS "developmentalLevyAmount"
       FROM users
       WHERE application_status = 'approved'
         AND (annual_due_paid = TRUE OR annual_developmental_fee_paid = TRUE)
       ORDER BY last_name, first_name`
    );
    return res.json({ members: result.rows });
  } catch (err) {
    console.error("Error fetching dues directory:", err);
    return res.status(500).json({ error: "Failed to fetch dues directory." });
  }
});
