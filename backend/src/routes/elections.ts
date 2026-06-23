import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db";

export const electionsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";

// ─── Auth helper ───────────────────────────────────────────────────────────
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
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    return payload;
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
// ELECTIONS CRUD
// ============================================================================

// ─── GET /api/elections ───────────────────────────────────────────────────
electionsRouter.get("/elections", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM election_positions WHERE election_id = e.id) AS positions_count,
        (SELECT COUNT(*) FROM election_votes WHERE election_id = e.id) AS total_votes,
        (SELECT COUNT(*) FROM users WHERE
          application_status = 'approved' AND
          membership_expires_at > NOW()
        ) AS eligible_voters
       FROM elections e
       ORDER BY e.created_at DESC`
    );
    return res.json({ elections: result.rows });
  } catch (err) {
    console.error("Error fetching elections:", err);
    return res.status(500).json({ error: "Failed to fetch elections." });
  }
});

// ─── GET /api/elections/:id ───────────────────────────────────────────────
electionsRouter.get("/elections/:id", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const electionResult = await db.query(
      `SELECT e.*,
        (SELECT COUNT(*) FROM users WHERE
          application_status = 'approved' AND
          membership_expires_at > NOW()
        ) AS eligible_voters
       FROM elections e WHERE e.id = $1`,
      [id]
    );
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    const positionsResult = await db.query(
      `SELECT ep.*,
        (SELECT COUNT(*) FROM election_candidates WHERE position_id = ep.id) AS candidates_count,
        (SELECT COUNT(*) FROM election_votes WHERE position_id = ep.id) AS votes_count
       FROM election_positions ep
       WHERE ep.election_id = $1
       ORDER BY ep.sort_order, ep.created_at`,
      [id]
    );

    const election = electionResult.rows[0];
    election.positions = positionsResult.rows;

    return res.json({ election });
  } catch (err) {
    console.error("Error fetching election:", err);
    return res.status(500).json({ error: "Failed to fetch election." });
  }
});

// ─── POST /api/elections (admin) ──────────────────────────────────────────
electionsRouter.post("/elections", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const {
      title, description, startDate, endDate, eligibleRoles,
      declarationStart, declarationEnd,
      nominationStart, nominationEnd,
      eligibleVotersReleaseDate, screeningDate,
      qualifiedCandidatesReleaseDate, manifestoDate,
      electionDate, swearingInDate,
    } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO elections (
        title, description, start_date, end_date, eligible_roles, created_by,
        declaration_start, declaration_end,
        nomination_start, nomination_end,
        eligible_voters_release_date, screening_date,
        qualified_candidates_release_date, manifesto_date,
        election_date, swearing_in_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        startDate || null,
        endDate || null,
        eligibleRoles || [],
        auth.userId,
        declarationStart || null,
        declarationEnd || null,
        nominationStart || null,
        nominationEnd || null,
        eligibleVotersReleaseDate || null,
        screeningDate || null,
        qualifiedCandidatesReleaseDate || null,
        manifestoDate || null,
        electionDate || null,
        swearingInDate || null,
      ]
    );

    return res.status(201).json({ election: result.rows[0] });
  } catch (err) {
    console.error("Error creating election:", err);
    return res.status(500).json({ error: "Failed to create election." });
  }
});

// ─── PUT /api/elections/:id (admin) ───────────────────────────────────────
electionsRouter.put("/elections/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const {
      title, description, startDate, endDate, eligibleRoles,
      declarationStart, declarationEnd,
      nominationStart, nominationEnd,
      eligibleVotersReleaseDate, screeningDate,
      qualifiedCandidatesReleaseDate, manifestoDate,
      electionDate, swearingInDate,
    } = req.body;
    const db = getDbPool();

    const result = await db.query(
      `UPDATE elections SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        eligible_roles = COALESCE($5, eligible_roles),
        declaration_start = COALESCE($6, declaration_start),
        declaration_end = COALESCE($7, declaration_end),
        nomination_start = COALESCE($8, nomination_start),
        nomination_end = COALESCE($9, nomination_end),
        eligible_voters_release_date = COALESCE($10, eligible_voters_release_date),
        screening_date = COALESCE($11, screening_date),
        qualified_candidates_release_date = COALESCE($12, qualified_candidates_release_date),
        manifesto_date = COALESCE($13, manifesto_date),
        election_date = COALESCE($14, election_date),
        swearing_in_date = COALESCE($15, swearing_in_date)
       WHERE id = $16 RETURNING *`,
      [
        title?.trim() || null,
        description !== undefined ? (description?.trim() || null) : null,
        startDate !== undefined ? startDate : null,
        endDate !== undefined ? endDate : null,
        eligibleRoles || null,
        declarationStart !== undefined ? declarationStart : null,
        declarationEnd !== undefined ? declarationEnd : null,
        nominationStart !== undefined ? nominationStart : null,
        nominationEnd !== undefined ? nominationEnd : null,
        eligibleVotersReleaseDate !== undefined ? eligibleVotersReleaseDate : null,
        screeningDate !== undefined ? screeningDate : null,
        qualifiedCandidatesReleaseDate !== undefined ? qualifiedCandidatesReleaseDate : null,
        manifestoDate !== undefined ? manifestoDate : null,
        electionDate !== undefined ? electionDate : null,
        swearingInDate !== undefined ? swearingInDate : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    return res.json({ election: result.rows[0] });
  } catch (err) {
    console.error("Error updating election:", err);
    return res.status(500).json({ error: "Failed to update election." });
  }
});

// ─── PUT /api/elections/:id/status (admin) ────────────────────────────────
electionsRouter.put("/elections/:id/status", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "upcoming", "active", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const db = getDbPool();

    // When activating, set dates automatically if not set
    const now = new Date();
    let updates: string[] = ["status = $1"];
    const params: any[] = [status];

    if (status === "active") {
      updates.push("start_date = COALESCE(start_date, $2)");
      params.push(now);
    }
    if (status === "closed") {
      updates.push("end_date = COALESCE(end_date, $2)");
      params.push(now);
    }

    params.push(id);
    const result = await db.query(
      `UPDATE elections SET ${updates.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    return res.json({ election: result.rows[0] });
  } catch (err) {
    console.error("Error updating election status:", err);
    return res.status(500).json({ error: "Failed to update election status." });
  }
});

// ─── DELETE /api/elections/:id (admin) ────────────────────────────────────
electionsRouter.delete("/elections/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query("DELETE FROM elections WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }
    return res.json({ message: "Election deleted." });
  } catch (err) {
    console.error("Error deleting election:", err);
    return res.status(500).json({ error: "Failed to delete election." });
  }
});

// ============================================================================
// POSITIONS
// ============================================================================

// ─── POST /api/elections/:electionId/positions (admin) ───────────────────
electionsRouter.post("/elections/:electionId/positions", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { electionId } = req.params;
    const { title, description, maxCandidates, sortOrder } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO election_positions (election_id, title, description, max_candidates, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [electionId, title.trim(), description?.trim() || null, maxCandidates || 1, sortOrder || 0]
    );

    return res.status(201).json({ position: result.rows[0] });
  } catch (err) {
    console.error("Error creating position:", err);
    return res.status(500).json({ error: "Failed to create position." });
  }
});

// ─── PUT /api/elections/positions/:id (admin) ────────────────────────────
electionsRouter.put("/elections/positions/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const { title, description, maxCandidates, sortOrder } = req.body;
    const db = getDbPool();

    const result = await db.query(
      `UPDATE election_positions SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        max_candidates = COALESCE($3, max_candidates),
        sort_order = COALESCE($4, sort_order)
       WHERE id = $5 RETURNING *`,
      [title?.trim() || null, description?.trim() || null, maxCandidates || null, sortOrder || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found." });
    }
    return res.json({ position: result.rows[0] });
  } catch (err) {
    console.error("Error updating position:", err);
    return res.status(500).json({ error: "Failed to update position." });
  }
});

// ─── DELETE /api/elections/positions/:id (admin) ─────────────────────────
electionsRouter.delete("/elections/positions/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query("DELETE FROM election_positions WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Position not found." });
    }
    return res.json({ message: "Position deleted." });
  } catch (err) {
    console.error("Error deleting position:", err);
    return res.status(500).json({ error: "Failed to delete position." });
  }
});
// ============================================================================
// ELIGIBLE VOTERS (admin)
// ============================================================================

// ─── GET /api/elections/:id/eligible-voters ───────────────────────────────
electionsRouter.get("/elections/:id/eligible-voters", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.membership_code,
              u.membership_category_name, u.membership_expires_at,
              u.annual_due_paid, u.annual_developmental_fee_paid,
              u.annual_due_year, u.annual_developmental_fee_year
       FROM users u
       WHERE u.is_admin = FALSE
         AND u.is_suspended = FALSE
         AND u.application_status = 'approved'
         AND u.membership_expires_at IS NOT NULL
         AND u.membership_expires_at > NOW()
         AND u.annual_due_paid = TRUE
         AND u.annual_developmental_fee_paid = TRUE
       ORDER BY u.last_name, u.first_name`
    );

    const voters = result.rows.map((r: any) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      membershipCode: r.membership_code || "—",
      category: r.membership_category_name || "—",
      expiresAt: r.membership_expires_at,
      annualDuePaid: r.annual_due_paid,
      annualDueYear: r.annual_due_year,
      developmentalFeePaid: r.annual_developmental_fee_paid,
      developmentalFeeYear: r.annual_developmental_fee_year,
    }));

    return res.json({ voters });
  } catch (err) {
    console.error("Error fetching eligible voters:", err);
    return res.status(500).json({ error: "Failed to fetch eligible voters." });
  }
});
// ============================================================================
// DECLARATIONS (members declare interest in positions)
// ============================================================================

// ─── POST /api/elections/:id/declare ──────────────────────────────────────
electionsRouter.post("/elections/:id/declare", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  try {
    const db = getDbPool();
    const { id } = req.params;
    const { positionId, statement } = req.body;

    if (!positionId) {
      return res.status(400).json({ error: "Position ID is required." });
    }

    // Check election exists and is in a valid state
    const electionResult = await db.query(
      "SELECT id, status FROM elections WHERE id = $1",
      [id]
    );
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }
    if (electionResult.rows[0].status !== "upcoming" && electionResult.rows[0].status !== "draft") {
      return res.status(400).json({ error: "Declarations are only accepted during upcoming or draft phase." });
    }

    // Verify position belongs to this election
    const posResult = await db.query(
      "SELECT id FROM election_positions WHERE id = $1 AND election_id = $2",
      [positionId, id]
    );
    if (posResult.rows.length === 0) {
      return res.status(400).json({ error: "Position not found in this election." });
    }

    // Check user is eligible (approved member with active membership)
    const userResult = await db.query(
      "SELECT id FROM users WHERE id = $1 AND application_status = 'approved' AND membership_expires_at > NOW()",
      [auth.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: "Only active members with approved status can declare interest." });
    }

    // Check if already declared for this position
    const existingResult = await db.query(
      "SELECT id, status FROM election_declarations WHERE position_id = $1 AND user_id = $2",
      [positionId, auth.userId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "You have already declared interest in this position.",
        declaration: existingResult.rows[0],
      });
    }

    const result = await db.query(
      `INSERT INTO election_declarations (election_id, position_id, user_id, statement)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, positionId, auth.userId, statement?.trim() || null]
    );

    return res.status(201).json({ declaration: result.rows[0] });
  } catch (err) {
    console.error("Error declaring interest:", err);
    return res.status(500).json({ error: "Failed to submit declaration." });
  }
});

// ─── GET /api/elections/:id/my-declarations ───────────────────────────────
electionsRouter.get("/elections/:id/my-declarations", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT d.*, ep.title AS position_title
       FROM election_declarations d
       JOIN election_positions ep ON d.position_id = ep.id
       WHERE d.election_id = $1 AND d.user_id = $2
       ORDER BY ep.sort_order, ep.created_at`,
      [req.params.id, auth.userId]
    );
    return res.json({ declarations: result.rows });
  } catch (err) {
    console.error("Error fetching my declarations:", err);
    return res.status(500).json({ error: "Failed to fetch declarations." });
  }
});

// ─── GET /api/elections/:id/declarations (admin) ──────────────────────────
electionsRouter.get("/elections/:id/declarations", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT d.*, ep.title AS position_title,
              u.first_name, u.last_name, u.email, u.membership_code, u.membership_category_name
       FROM election_declarations d
       JOIN election_positions ep ON d.position_id = ep.id
       JOIN users u ON d.user_id = u.id
       WHERE d.election_id = $1
       ORDER BY d.status, ep.sort_order, d.created_at`,
      [req.params.id]
    );
    return res.json({ declarations: result.rows });
  } catch (err) {
    console.error("Error fetching declarations:", err);
    return res.status(500).json({ error: "Failed to fetch declarations." });
  }
});

// ─── PUT /api/elections/declarations/:id (admin approve/reject) ──────────
electionsRouter.put("/elections/declarations/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    }

    const db = getDbPool();

    // Get the declaration
    const declResult = await db.query(
      "SELECT * FROM election_declarations WHERE id = $1",
      [id]
    );
    if (declResult.rows.length === 0) {
      return res.status(404).json({ error: "Declaration not found." });
    }

    const declaration = declResult.rows[0];

    // Update declaration status
    await db.query(
      "UPDATE election_declarations SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3",
      [status, auth.userId, id]
    );

    // If approved, add to candidates
    if (status === "approved") {
      // Check if already a candidate
      const existingCandidate = await db.query(
        "SELECT id FROM election_candidates WHERE position_id = $1 AND user_id = $2",
        [declaration.position_id, declaration.user_id]
      );

      if (existingCandidate.rows.length === 0) {
        // Get the max sort_order for this position
        const maxSort = await db.query(
          "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM election_candidates WHERE position_id = $1",
          [declaration.position_id]
        );

        await db.query(
          `INSERT INTO election_candidates (election_id, position_id, user_id, declaration_id, statement, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            declaration.election_id,
            declaration.position_id,
            declaration.user_id,
            id,
            declaration.statement,
            maxSort.rows[0].next_sort,
          ]
        );
      }
    }

    return res.json({ message: `Declaration ${status}.` });
  } catch (err) {
    console.error("Error updating declaration:", err);
    return res.status(500).json({ error: "Failed to update declaration." });
  }
});

// ─── DELETE /api/elections/declarations/:id (admin) ───────────────────────
electionsRouter.delete("/elections/declarations/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const db = getDbPool();

    // Get the declaration
    const declResult = await db.query(
      "SELECT * FROM election_declarations WHERE id = $1",
      [id]
    );
    if (declResult.rows.length === 0) {
      return res.status(404).json({ error: "Declaration not found." });
    }

    const declaration = declResult.rows[0];

    // Remove any associated candidate first
    await db.query(
      "DELETE FROM election_candidates WHERE declaration_id = $1",
      [id]
    );

    // Delete the declaration
    await db.query("DELETE FROM election_declarations WHERE id = $1", [id]);

    return res.json({ message: "Declaration deleted." });
  } catch (err) {
    console.error("Error deleting declaration:", err);
    return res.status(500).json({ error: "Failed to delete declaration." });
  }
});

// ─── POST /api/elections/:id/declare-as-admin (admin) ────────────────────
electionsRouter.post("/elections/:id/declare-as-admin", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const { id } = req.params;
    const { positionId, userId, statement } = req.body;

    if (!positionId || !userId) {
      return res.status(400).json({ error: "Position ID and User ID are required." });
    }

    // Verify the election exists
    const electionResult = await db.query(
      "SELECT id, status FROM elections WHERE id = $1",
      [id]
    );
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }

    // Verify position belongs to this election
    const posResult = await db.query(
      "SELECT id FROM election_positions WHERE id = $1 AND election_id = $2",
      [positionId, id]
    );
    if (posResult.rows.length === 0) {
      return res.status(400).json({ error: "Position not found in this election." });
    }

    // Verify user exists
    const userResult = await db.query(
      "SELECT id, first_name, last_name FROM users WHERE id = $1",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if already declared for this position
    const existingResult = await db.query(
      "SELECT id, status FROM election_declarations WHERE position_id = $1 AND user_id = $2",
      [positionId, userId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "This member has already declared interest in this position.",
        declaration: existingResult.rows[0],
      });
    }

    // Auto-approve when admin declares on behalf of a member
    const result = await db.query(
      `INSERT INTO election_declarations (election_id, position_id, user_id, statement, status, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, 'approved', $5, NOW())
       RETURNING *`,
      [id, positionId, userId, statement?.trim() || null, auth.userId]
    );

    const declaration = result.rows[0];

    // Auto-add as candidate
    const maxSort = await db.query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM election_candidates WHERE position_id = $1",
      [positionId]
    );

    await db.query(
      `INSERT INTO election_candidates (election_id, position_id, user_id, declaration_id, statement, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, positionId, userId, declaration.id, declaration.statement, maxSort.rows[0].next_sort]
    );

    return res.status(201).json({ declaration, message: "Declaration created and approved." });
  } catch (err) {
    console.error("Error creating declaration as admin:", err);
    return res.status(500).json({ error: "Failed to create declaration." });
  }
});

// ============================================================================
// CANDIDATES (public view)
// ============================================================================

// ─── GET /api/elections/:id/candidates ────────────────────────────────────
electionsRouter.get("/elections/:id/candidates", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT c.id, c.position_id, c.user_id, c.statement, c.sort_order,
              u.first_name, u.last_name, u.membership_code, u.membership_category_name,
              ep.title AS position_title
       FROM election_candidates c
       JOIN users u ON c.user_id = u.id
       JOIN election_positions ep ON c.position_id = ep.id
       WHERE c.election_id = $1
       ORDER BY ep.sort_order, c.sort_order`,
      [req.params.id]
    );
    return res.json({ candidates: result.rows });
  } catch (err) {
    console.error("Error fetching candidates:", err);
    return res.status(500).json({ error: "Failed to fetch candidates." });
  }
});

// ============================================================================
// VOTING
// ============================================================================

// ─── POST /api/elections/:id/vote ─────────────────────────────────────────
electionsRouter.post("/elections/:id/vote", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  try {
    const db = getDbPool();
    const { id } = req.params;
    const { votes } = req.body; // Array of { positionId, candidateId }

    if (!votes || !Array.isArray(votes) || votes.length === 0) {
      return res.status(400).json({ error: "Votes array is required." });
    }

    // Check election is active
    const electionResult = await db.query(
      "SELECT id, status, start_date, end_date FROM elections WHERE id = $1",
      [id]
    );
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }
    const election = electionResult.rows[0];

    if (election.status !== "active") {
      return res.status(400).json({ error: "Voting is not active for this election." });
    }

    // Check voting period
    const now = new Date();
    if (election.start_date && new Date(election.start_date) > now) {
      return res.status(400).json({ error: "Voting has not started yet." });
    }
    if (election.end_date && new Date(election.end_date) < now) {
      return res.status(400).json({ error: "Voting period has ended." });
    }

    // Check user is eligible
    const userResult = await db.query(
      "SELECT id FROM users WHERE id = $1 AND application_status = 'approved' AND membership_expires_at > NOW()",
      [auth.userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: "Only active members with approved status can vote." });
    }

    // Process votes in transaction
    const client = await db.connect();
    try {
      await client.query("BEGIN");

      for (const vote of votes) {
        const { positionId, candidateId } = vote;

        // Verify position belongs to election
        const posCheck = await client.query(
          "SELECT id FROM election_positions WHERE id = $1 AND election_id = $2",
          [positionId, id]
        );
        if (posCheck.rows.length === 0) {
          throw new Error(`Position ${positionId} not found in this election.`);
        }

        // Verify candidate belongs to position
        const candCheck = await client.query(
          "SELECT id FROM election_candidates WHERE id = $1 AND position_id = $2 AND election_id = $3",
          [candidateId, positionId, id]
        );
        if (candCheck.rows.length === 0) {
          throw new Error(`Candidate ${candidateId} not found for position ${positionId}.`);
        }

        // Check if already voted for this position
        const existingVote = await client.query(
          "SELECT id FROM election_votes WHERE position_id = $1 AND voter_id = $2",
          [positionId, auth.userId]
        );
        if (existingVote.rows.length > 0) {
          throw new Error("You have already voted for one of these positions.");
        }

        // Cast vote
        await client.query(
          `INSERT INTO election_votes (election_id, position_id, voter_id, candidate_id)
           VALUES ($1, $2, $3, $4)`,
          [id, positionId, auth.userId, candidateId]
        );
      }

      await client.query("COMMIT");
      return res.json({ message: "Vote cast successfully." });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("already voted")) {
        return res.status(409).json({ error: err.message });
      }
      if (err.message.includes("not found")) {
        return res.status(400).json({ error: err.message });
      }
    }
    console.error("Error casting vote:", err);
    return res.status(500).json({ error: "Failed to cast vote." });
  }
});

// ─── GET /api/elections/:id/has-voted ─────────────────────────────────────
electionsRouter.get("/elections/:id/has-voted", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT position_id FROM election_votes WHERE election_id = $1 AND voter_id = $2`,
      [req.params.id, auth.userId]
    );
    return res.json({ votedPositions: result.rows.map((r) => r.position_id) });
  } catch (err) {
    console.error("Error checking vote status:", err);
    return res.status(500).json({ error: "Failed to check vote status." });
  }
});

// ============================================================================
// NOMINATION / EXPRESSION OF INTEREST (Public)
// ============================================================================

// ─── POST /api/elections/nominate ─────────────────────────────────────────
electionsRouter.post("/elections/nominate", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;

  try {
    const { formType, position, statement } = req.body;
    if (!formType || !position) {
      return res.status(400).json({ error: "Form type and position are required." });
    }

    const db = getDbPool();

    // Verify user is an approved member
    const userResult = await db.query(
      "SELECT id, first_name, last_name, membership_code, application_status FROM users WHERE id = $1",
      [auth.userId]
    );
    if (userResult.rows.length === 0 || userResult.rows[0].application_status !== "approved") {
      return res.status(403).json({ error: "Only approved members can submit nominations." });
    }

    const user = userResult.rows[0];

    // Find the active election (2026/2028)
    const electionResult = await db.query(
      "SELECT id, title FROM elections WHERE status IN ('upcoming', 'draft', 'active') ORDER BY created_at DESC LIMIT 1"
    );
    if (electionResult.rows.length === 0) {
      // Auto-create an election if none exists
      return res.status(400).json({ error: "No active election found. Please contact the administrator." });
    }

    const election = electionResult.rows[0];

    // Map position to a position title
    const positionTitles: Record<string, string> = {
      president: "President",
      "vice-president": "Vice President",
      "general-secretary": "General Secretary",
      "assistant-secretary": "Assistant Secretary",
      treasurer: "Treasurer",
      "financial-secretary": "Financial Secretary",
      "public-relations-officer": "Public Relations Officer (PRO)",
      "welfare-officer": "Welfare Officer",
      auditor: "Auditor",
    };

    const positionTitle = positionTitles[position];
    if (!positionTitle) {
      return res.status(400).json({ error: "Invalid position selected." });
    }

    // Find or create the position in the election
    let posResult = await db.query(
      "SELECT id FROM election_positions WHERE election_id = $1 AND title = $2",
      [election.id, positionTitle]
    );

    let positionId: string;
    if (posResult.rows.length === 0) {
      // Create the position
      const newPos = await db.query(
        "INSERT INTO election_positions (election_id, title, max_candidates, sort_order) VALUES ($1, $2, 1, 0) RETURNING id",
        [election.id, positionTitle]
      );
      positionId = newPos.rows[0].id;
    } else {
      positionId = posResult.rows[0].id;
    }

    // Check if already declared
    const existingDecl = await db.query(
      "SELECT id, status FROM election_declarations WHERE position_id = $1 AND user_id = $2",
      [positionId, auth.userId]
    );
    if (existingDecl.rows.length > 0) {
      return res.status(409).json({
        error: `You have already submitted a ${existingDecl.rows[0].status} declaration for ${positionTitle}.`,
        declaration: existingDecl.rows[0],
      });
    }

    // Insert declaration
    const declResult = await db.query(
      `INSERT INTO election_declarations (election_id, position_id, user_id, statement)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [election.id, positionId, auth.userId, statement?.trim() || null]
    );

    console.log(`[nomination] ${user.first_name} ${user.last_name} (${user.membership_code}) submitted ${formType} for ${positionTitle}`);

    return res.status(201).json({
      message: `${formType === "expression" ? "Expression of Interest" : "Nomination"} submitted successfully for ${positionTitle}.`,
      declaration: declResult.rows[0],
    });
  } catch (err) {
    console.error("Error submitting nomination:", err);
    return res.status(500).json({ error: "Failed to submit nomination." });
  }
});

// ============================================================================
// RESULTS
// ============================================================================

// ─── GET /api/elections/:id/results ───────────────────────────────────────
electionsRouter.get("/elections/:id/results", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = _req.params;

    // Get election info
    const electionResult = await db.query("SELECT * FROM elections WHERE id = $1", [id]);
    if (electionResult.rows.length === 0) {
      return res.status(404).json({ error: "Election not found." });
    }
    const election = electionResult.rows[0];

    // Count eligible voters (approved members with active membership)
    const eligibleResult = await db.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE application_status = 'approved' AND membership_expires_at > NOW()`
    );
    const eligibleVoters = parseInt(eligibleResult.rows[0].count, 10);

    // Count total unique voters for this election
    const totalVotersResult = await db.query(
      "SELECT COUNT(DISTINCT voter_id) AS count FROM election_votes WHERE election_id = $1",
      [id]
    );
    const totalVoters = parseInt(totalVotersResult.rows[0].count, 10);

    // Get positions with candidates and vote counts
    const positionsResult = await db.query(
      `SELECT ep.* FROM election_positions ep WHERE ep.election_id = $1 ORDER BY ep.sort_order, ep.created_at`,
      [id]
    );

    const positions = [];
    for (const pos of positionsResult.rows) {
      const candidatesResult = await db.query(
        `SELECT c.id, c.user_id, c.statement, c.sort_order,
                u.first_name, u.last_name, u.membership_code, u.membership_category_name,
                (SELECT COUNT(*) FROM election_votes WHERE candidate_id = c.id AND position_id = c.position_id) AS vote_count
         FROM election_candidates c
         JOIN users u ON c.user_id = u.id
         WHERE c.position_id = $1
         ORDER BY c.sort_order`,
        [pos.id]
      );

      // Get total votes for this position
      const posVotesResult = await db.query(
        "SELECT COUNT(*) AS count FROM election_votes WHERE position_id = $1",
        [pos.id]
      );
      const positionTotalVotes = parseInt(posVotesResult.rows[0].count, 10);

      const candidates = candidatesResult.rows.map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        firstName: c.first_name,
        lastName: c.last_name,
        membershipCode: c.membership_code,
        membershipCategory: c.membership_category_name,
        statement: c.statement,
        sortOrder: c.sort_order,
        voteCount: parseInt(c.vote_count, 10),
        percentage: positionTotalVotes > 0
          ? Math.round((parseInt(c.vote_count, 10) / positionTotalVotes) * 100 * 10) / 10
          : 0,
      }));

      positions.push({
        id: pos.id,
        title: pos.title,
        description: pos.description,
        sortOrder: pos.sort_order,
        totalVotes: positionTotalVotes,
        candidates,
      });
    }

    return res.json({
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        status: election.status,
        startDate: election.start_date,
        endDate: election.end_date,
      },
      summary: {
        eligibleVoters,
        totalVoters,
        turnout: eligibleVoters > 0
          ? Math.round((totalVoters / eligibleVoters) * 100 * 10) / 10
          : 0,
        turnoutPercentage: eligibleVoters > 0
          ? Math.round((totalVoters / eligibleVoters) * 100)
          : 0,
      },
      positions,
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    return res.status(500).json({ error: "Failed to fetch results." });
  }
});

// ============================================================================
// ELECTION EVENTS (election milestones shown as events)
// ============================================================================

// ─── GET /api/elections/events ───────────────────────────────────────────
electionsRouter.get("/elections/events", async (_req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, title, description,
              declaration_start, declaration_end,
              nomination_start, nomination_end,
              eligible_voters_release_date,
              screening_date,
              qualified_candidates_release_date,
              manifesto_date,
              election_date,
              swearing_in_date,
              start_date, end_date,
              status
       FROM elections
       WHERE status IN ('upcoming', 'active', 'draft')
       ORDER BY COALESCE(election_date, start_date, declaration_start) ASC`
    );

    const events: any[] = [];

    for (const el of result.rows) {
      const milestones: { date: string | null; title: string; desc: string }[] = [
        { date: el.declaration_start, title: `${el.title} — Declaration of Interest Opens`, desc: "Submission of declarations begins." },
        { date: el.declaration_end, title: `${el.title} — Declaration of Interest Closes`, desc: "Deadline for declaration submissions." },
        { date: el.nomination_start, title: `${el.title} — Nominations Open`, desc: "Nomination period begins." },
        { date: el.nomination_end, title: `${el.title} — Nominations Close`, desc: "Deadline for nominations." },
        { date: el.eligible_voters_release_date, title: `${el.title} — Eligible Voters List Published`, desc: "List of eligible voters is released." },
        { date: el.screening_date, title: `${el.title} — Candidate Screening`, desc: "Screening of candidates takes place." },
        { date: el.qualified_candidates_release_date, title: `${el.title} — Qualified Candidates Announced`, desc: "Final list of qualified candidates is published." },
        { date: el.manifesto_date, title: `${el.title} — Manifesto Presentation`, desc: "Candidates present their manifestos." },
        { date: el.election_date, title: `${el.title} — Election Day`, desc: "Voting takes place." },
        { date: el.swearing_in_date, title: `${el.title} — Swearing-In Ceremony`, desc: "Swearing-in of elected officials." },
        { date: el.start_date, title: `${el.title} — Election Period Starts`, desc: "The election period officially begins." },
        { date: el.end_date, title: `${el.title} — Election Period Ends`, desc: "The election period officially ends." },
      ];

      for (const m of milestones) {
        if (m.date) {
          events.push({
            id: `election-${el.id}-${m.title.replace(/\s+/g, "-").toLowerCase()}`,
            title: m.title,
            description: m.desc,
            location: "Global Headquarters",
            event_date: m.date,
            event_time: null,
            badge_label: el.status === "active" ? "Ongoing" : el.status === "upcoming" ? "Upcoming" : "Draft",
            badge_class: "election",
            status: "open",
            image_url: null,
            source: "election",
            election_id: el.id,
            created_at: el.created_at || new Date(),
          });
        }
      }
    }

    return res.json({ events });
  } catch (err) {
    console.error("Error fetching election events:", err);
    return res.status(500).json({ error: "Failed to fetch election events." });
  }
});
