import { Router, Request, Response } from "express";
import { getDbPool } from "../db";

export const adminReportsRouter = Router();

// ─── GET /api/admin/reports ───────────────────────────────────────────────
adminReportsRouter.get("/admin/reports", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();

    // ── 1. Total registered (exclude admin) ────────────────────────────────
    const totalResult = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_admin = FALSE"
    );
    const totalRegistered = parseInt(totalResult.rows[0].count, 10);

    // ── 2. YoY growth ──────────────────────────────────────────────────────
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);

    const thisYearResult = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_admin = FALSE AND created_at >= $1",
      [oneYearAgo]
    );
    const lastYearResult = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_admin = FALSE AND created_at >= $1 AND created_at < $2",
      [twoYearsAgo, oneYearAgo]
    );
    const thisYear = parseInt(thisYearResult.rows[0].count, 10);
    const lastYear = parseInt(lastYearResult.rows[0].count, 10);
    const yoyGrowth = lastYear > 0 ? Math.round(((thisYear - lastYear) / lastYear) * 100) : 0;

    // ── 3. Renewal rate ────────────────────────────────────────────────────
    const expiredResult = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE membership_expires_at > NOW()) AS active
       FROM users
       WHERE application_status = 'approved' AND is_admin = FALSE AND is_suspended = FALSE`
    );
    const activeCount = parseInt(expiredResult.rows[0].active, 10);
    const approvedCount = parseInt(expiredResult.rows[0].total, 10);
    const renewalRate = approvedCount > 0 ? Math.round((activeCount / approvedCount) * 100) : 0;

    // ── 4. Voter turnout (latest closed election) ──────────────────────────
    let voterTurnout = 0;
    const latestElection = await db.query(
      `SELECT id, title FROM elections WHERE status = 'closed' ORDER BY end_date DESC LIMIT 1`
    );
    if (latestElection.rows.length > 0) {
      const electionId = latestElection.rows[0].id;
      const eligibleResult = await db.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE application_status = 'approved'
           AND membership_expires_at > NOW()
           AND is_admin = FALSE
           AND is_suspended = FALSE`
      );
      const votedResult = await db.query(
        "SELECT COUNT(DISTINCT voter_id) AS count FROM election_votes WHERE election_id = $1",
        [electionId]
      );
      const eligible = parseInt(eligibleResult.rows[0].count, 10);
      const voted = parseInt(votedResult.rows[0].count, 10);
      voterTurnout = eligible > 0 ? Math.round((voted / eligible) * 1000) / 10 : 0;
    }

    // ── 5. Membership by category ──────────────────────────────────────────
    const categoryResult = await db.query(
      `SELECT
        COALESCE(membership_category_name, 'Other') AS label,
        COUNT(*) AS val
       FROM users
       WHERE is_admin = FALSE
       GROUP BY membership_category_name
       ORDER BY val DESC`
    );
    const categories = categoryResult.rows;
    const totalCat = categories.reduce((s: number, r: any) => s + parseInt(r.val, 10), 0);
    const membershipByCategory = categories.map((r: any) => ({
      label: r.label,
      val: parseInt(r.val, 10).toLocaleString(),
      pct: totalCat > 0 ? Math.round((parseInt(r.val, 10) / totalCat) * 100) : 0,
    }));

    // ── 6. Registration trends (monthly, last 7 months) ────────────────────
    const trendsResult = await db.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        COUNT(*) AS val
       FROM users
       WHERE is_admin = FALSE
         AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '6 months'
       GROUP BY month_date
       ORDER BY month_date ASC`
    );

    // Fill in missing months
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const trendsMap: Record<string, number> = {};
    for (const r of trendsResult.rows) {
      trendsMap[r.month] = parseInt(r.val, 10);
    }
    const trends: { month: string; val: number; h: number; o: number }[] = [];
    let maxVal = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = monthNames[d.getMonth()];
      const v = trendsMap[m] || 0;
      if (v > maxVal) maxVal = v;
      trends.push({ month: m, val: v, h: 0, o: 0 });
    }
    const barMax = 160;
    for (const t of trends) {
      t.h = maxVal > 0 ? Math.max(20, Math.round((t.val / maxVal) * barMax)) : 20;
      t.o = 0.5 + (t.val / (maxVal || 1)) * 0.5;
    }

    // ── 7. Payment summary ─────────────────────────────────────────────────
    const paymentResult = await db.query(
      `SELECT
        COALESCE(p.payment_type, 'registration') AS type,
        COALESCE(u.membership_category_name, 'Other') AS category,
        COUNT(*) AS count,
        SUM(p.amount_kobo) AS total_kobo
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'success'
         AND p.paid_at >= $1
       GROUP BY GROUPING SETS ((p.payment_type), (u.membership_category_name), ())
       ORDER BY type, category`,
      [new Date(now.getFullYear(), 0, 1)] // current year
    );

    // Build payment summary from the aggregated data
    const paymentLabels: Record<string, { label: string; val: string; pct: number; total: number }> = {};
    let paymentTotalKobo = 0;

    for (const r of paymentResult.rows) {
      if (!r.type && !r.category) {
        // Grand total row
        paymentTotalKobo = parseInt(r.total_kobo || "0", 10);
      } else if (r.type === "registration") {
        paymentLabels["New Registrations"] = {
          label: "New Registrations",
          val: "",
          pct: 0,
          total: parseInt(r.total_kobo || "0", 10),
        };
      } else if (r.type === "renewal") {
        if (r.category) {
          paymentLabels[`${r.category} Renewals`] = {
            label: `${r.category} Renewals`,
            val: "",
            pct: 0,
            total: parseInt(r.total_kobo || "0", 10),
          };
        }
      }
    }

    // Also get total per payment_type directly
    const paymentTypeResult = await db.query(
      `SELECT
        payment_type,
        SUM(amount_kobo) AS total_kobo
       FROM payments
       WHERE status = 'success'
         AND paid_at >= $1
       GROUP BY payment_type`,
      [new Date(now.getFullYear(), 0, 1)]
    );

    for (const r of paymentTypeResult.rows) {
      const total = parseInt(r.total_kobo, 10);
      const label = r.payment_type === "registration" ? "New Registrations" : `${r.payment_type === "renewal" ? "Member" : r.payment_type} Renewals`;
      if (r.payment_type === "registration") {
        paymentLabels["New Registrations"] = { label: "New Registrations", val: "", pct: 0, total };
      }
    }

    // Aggregate category-based renewals
    const renewalByCat = await db.query(
      `SELECT
        COALESCE(u.membership_category_name, 'Other') AS category,
        SUM(p.amount_kobo) AS total_kobo
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'success'
         AND p.payment_type = 'renewal'
         AND p.paid_at >= $1
       GROUP BY u.membership_category_name
       ORDER BY total_kobo DESC`,
      [new Date(now.getFullYear(), 0, 1)]
    );

    for (const r of renewalByCat.rows) {
      const total = parseInt(r.total_kobo, 10);
      paymentLabels[`${r.category} Renewals`] = {
        label: `${r.category} Renewals`,
        val: "",
        pct: 0,
        total,
      };
      paymentTotalKobo += total;
    }

    // Add registrations total to grand total
    if (paymentLabels["New Registrations"]) {
      paymentTotalKobo += paymentLabels["New Registrations"].total;
    }

    const paymentSummary = Object.values(paymentLabels)
      .map((item) => ({
        ...item,
        val: `₦${(item.total / 100).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`,
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate percentages
    for (const item of paymentSummary) {
      item.pct = paymentTotalKobo > 0 ? Math.round((item.total / paymentTotalKobo) * 100) : 0;
    }

    // ── 8. Voting participation (last 3 elections) ─────────────────────────
    const electionsResult = await db.query(
      `SELECT id, title, status, end_date FROM elections ORDER BY end_date DESC NULLS LAST LIMIT 3`
    );

    const votingParticipation: { label: string; val: string; pct: number }[] = [];
    for (const e of electionsResult.rows) {
      const eligibleResult = await db.query(
        `SELECT COUNT(*) AS count FROM users
         WHERE application_status = 'approved'
           AND membership_expires_at > NOW()
           AND is_admin = FALSE
           AND is_suspended = FALSE`
      );
      const votedResult = await db.query(
        "SELECT COUNT(DISTINCT voter_id) AS count FROM election_votes WHERE election_id = $1",
        [e.id]
      );
      const eligible = parseInt(eligibleResult.rows[0].count, 10);
      const voted = parseInt(votedResult.rows[0].count, 10);
      const pct = eligible > 0 ? Math.round((voted / eligible) * 100) : 0;
      votingParticipation.push({
        label: e.title,
        val: `${pct}%`,
        pct,
      });
    }

    return res.json({
      stats: {
        totalRegistered,
        yoyGrowth,
        renewalRate,
        voterTurnout,
      },
      membershipByCategory,
      registrationTrends: trends,
      paymentSummary,
      votingParticipation,
    });
  } catch (err) {
    console.error("Error fetching reports:", err);
    return res.status(500).json({ error: "Failed to fetch reports data." });
  }
});

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────
adminReportsRouter.get("/admin/dashboard", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Total members (non-admin)
    const totalResult = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE is_admin = FALSE"
    );
    const totalMembers = parseInt(totalResult.rows[0].count, 10);

    // Active members (approved, not suspended, not expired)
    const activeResult = await db.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE is_admin = FALSE
         AND application_status = 'approved'
         AND is_suspended = FALSE
         AND membership_expires_at > NOW()`
    );
    const activeMembers = parseInt(activeResult.rows[0].count, 10);

    // Expiring within 30 days
    const expiringResult = await db.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE is_admin = FALSE
         AND application_status = 'approved'
         AND is_suspended = FALSE
         AND membership_expires_at BETWEEN NOW() AND $1`,
      [thirtyDaysLater]
    );
    const expiringSoon = parseInt(expiringResult.rows[0].count, 10);

    // Pending applications
    const pendingResult = await db.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE is_admin = FALSE
         AND application_status IN ('pending_payment', 'pending_approval')`
    );
    const pendingApplications = parseInt(pendingResult.rows[0].count, 10);

    // Pending approvals (paid, awaiting admin review)
    const pendingApprovalResult = await db.query(
      "SELECT COUNT(*) AS count FROM users WHERE application_status = 'pending_approval'"
    );
    const pendingApprovalCount = parseInt(pendingApprovalResult.rows[0].count, 10);

    // Recent activity — latest 5 registrations
    const recentUsers = await db.query(
      `SELECT first_name, last_name, email, application_status, membership_category_name, created_at
       FROM users WHERE is_admin = FALSE
       ORDER BY created_at DESC LIMIT 5`
    );

    // Recent activity — latest 5 payments
    const recentPayments = await db.query(
      `SELECT p.amount_kobo, p.payment_type, p.status, p.paid_at, u.first_name, u.last_name
       FROM payments p
       JOIN users u ON u.id = p.user_id
       WHERE p.status = 'success'
       ORDER BY p.paid_at DESC NULLS LAST LIMIT 5`
    );

    // Recent activity — latest 3 elections
    const recentElections = await db.query(
      `SELECT title, status, created_at FROM elections ORDER BY created_at DESC LIMIT 3`
    );

    // Build activity feed (interleave events)
    const activity: { type: string; text: string; time: string }[] = [];

    for (const u of recentUsers.rows) {
      const label = u.application_status === "pending_approval" || u.application_status === "pending_payment"
        ? "New application"
        : "Member registered";
      const cat = u.membership_category_name ? ` (${u.membership_category_name})` : "";
      activity.push({
        type: "approval",
        text: `<strong>${label}</strong> — ${u.first_name} ${u.last_name} applied${cat}`,
        time: formatRelativeTime(u.created_at),
      });
    }

    for (const p of recentPayments.rows) {
      const amt = `₦${(parseInt(p.amount_kobo, 10) / 100).toLocaleString()}`;
      activity.push({
        type: "payment",
        text: `<strong>Payment received</strong> — ${amt} from ${p.first_name} ${p.last_name} (${p.payment_type})`,
        time: p.paid_at ? formatRelativeTime(p.paid_at) : "recently",
      });
    }

    for (const e of recentElections.rows) {
      activity.push({
        type: "election",
        text: `<strong>Election ${e.status}</strong> — ${e.title}`,
        time: formatRelativeTime(e.created_at),
      });
    }

    // Sort by time descending and take latest 5
    activity.sort((a, b) => {
      const order: Record<string, number> = {
        "just now": 0, "1 minute ago": 1, "minutes ago": 2,
        "1 hour ago": 3, "hours ago": 4, "Today": 5, "Yesterday": 6,
      };
      return (order[a.time] ?? 99) - (order[b.time] ?? 99);
    });

    return res.json({
      stats: {
        totalMembers,
        activeMembers,
        expiringSoon,
        pendingApplications,
        pendingApprovalCount,
      },
      activity: activity.slice(0, 5),
    });
  } catch (err) {
    console.error("Error fetching dashboard:", err);
    return res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
});

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
