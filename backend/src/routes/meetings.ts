import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db";

export const meetingsRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "gkac-dev-secret-change-in-production";

// ─── Auth helpers ───────────────────────────────────────────────────────────
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
    return jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
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
// MEETINGS CRUD
// ============================================================================

// ─── Auto-complete past active meetings ──────────────────────────────────
// If a meeting's scheduled date (+ time) has passed, automatically transition
// it from "active" to "completed" so it no longer shows as "Live Now".
async function autoCompleteMeetings(): Promise<void> {
  try {
    const db = getDbPool();
    await db.query(
      `UPDATE meetings
       SET status = 'completed'
       WHERE status = 'active'
         AND meeting_date IS NOT NULL
         AND (
           meeting_date < CURRENT_DATE
           OR (meeting_date = CURRENT_DATE AND meeting_time IS NOT NULL AND meeting_time <= CURRENT_TIME)
         )`
    );
  } catch (err) {
    console.error("Error auto-completing meetings:", err);
  }
}

// ============================================================================
// MEETING EVENTS (return meetings formatted as calendar events for the events page)
// ============================================================================

// ─── GET /api/meetings/events ──────────────────────────────────────────
// Returns upcoming/active meetings in the same event-like format used by
// the content events and election events endpoints, so they can be merged
// seamlessly on the frontend.
// NOTE: This MUST be defined before /meetings/:id to avoid Express matching
// "events" as an :id parameter.
meetingsRouter.get("/meetings/events", async (_req: Request, res: Response) => {
  try {
    await autoCompleteMeetings();
    const db = getDbPool();
    const result = await db.query(
      `SELECT id, title, description, meeting_date, meeting_time, timezone,
              platform, meeting_link, meeting_id, passcode, dial_in_numbers,
              status, access_type, max_attendees, recording_link,
              created_by, created_at
       FROM meetings
       WHERE status IN ('upcoming', 'active')
       ORDER BY meeting_date ASC NULLS LAST, created_at DESC`
    );

    const events = result.rows.map((m: any) => {
      const platformLabels: Record<string, string> = {
        zoom: "Zoom",
        google_meet: "Google Meet",
        microsoft_teams: "Microsoft Teams",
        other: "Virtual",
      };

      return {
        id: `meeting-${m.id}`,
        title: m.title,
        description: m.description || null,
        location: platformLabels[m.platform] || "Virtual",
        event_date: m.meeting_date,
        event_time: m.meeting_time,
        badge_label: m.status === "active" ? "Live Now" : m.status === "upcoming" ? "Upcoming" : m.status,
        badge_class: "meeting",
        max_attendees: m.max_attendees,
        status: m.status,
        image_url: null,
        source: "meeting",
        meeting_id: m.id,
        meeting_link: m.meeting_link,
        meeting_platform: m.platform,
        created_at: m.created_at,
      };
    });

    return res.json({ events });
  } catch (err) {
    console.error("Error fetching meeting events:", err);
    return res.status(500).json({ error: "Failed to fetch meeting events." });
  }
});

// ─── GET /api/meetings ───────────────────────────────────────────────────
// Public listing — shows upcoming/active for anyone, all for admin
meetingsRouter.get("/meetings", async (req: Request, res: Response) => {
  try {
    await autoCompleteMeetings();
    const db = getDbPool();

    // Silently authenticate — no error response if missing/invalid token
    let userId: string | null = null;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
        userId = payload.userId;
      } catch { /* ignore — treat as unauthenticated */ }
    }

    // Check if user is admin
    let isAdmin = false;
    if (userId) {
      const adminResult = await db.query("SELECT is_admin FROM users WHERE id = $1", [userId]);
      isAdmin = adminResult.rows.length > 0 && adminResult.rows[0].is_admin;
    }

    if (isAdmin) {
      // Admin sees all meetings
      const result = await db.query(
        `SELECT m.*,
          (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = m.id) AS attendee_count,
          u.first_name AS creator_first_name,
          u.last_name AS creator_last_name
         FROM meetings m
         LEFT JOIN users u ON u.id = m.created_by
         ORDER BY m.meeting_date DESC NULLS LAST, m.created_at DESC`
      );
      return res.json({ meetings: result.rows });
    }

    // Non-admin sees only upcoming/active
    const result = await db.query(
      `SELECT m.*,
        (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = m.id) AS attendee_count
       FROM meetings m
       WHERE m.status IN ('upcoming', 'active')
       ORDER BY m.meeting_date ASC NULLS LAST, m.created_at DESC`
    );
    return res.json({ meetings: result.rows });
  } catch (err) {
    console.error("Error fetching meetings:", err);
    return res.status(500).json({ error: "Failed to fetch meetings." });
  }
});

// ─── GET /api/meetings/:id ───────────────────────────────────────────────
meetingsRouter.get("/meetings/:id", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;

    const result = await db.query(
      `SELECT m.*,
        (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = m.id) AS attendee_count,
        u.first_name AS creator_first_name,
        u.last_name AS creator_last_name
       FROM meetings m
       LEFT JOIN users u ON u.id = m.created_by
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    return res.json({ meeting: result.rows[0] });
  } catch (err) {
    console.error("Error fetching meeting:", err);
    return res.status(500).json({ error: "Failed to fetch meeting." });
  }
});

// ─── POST /api/meetings (admin) ─────────────────────────────────────────
meetingsRouter.post("/meetings", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const {
      title, description, meetingDate, meetingTime, timezone,
      platform, meetingLink, meetingId, passcode, dialInNumbers,
      accessType, maxAttendees, recordingLink,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required." });
    }

    // Auto-compute status based on dates
    const now = new Date();
    let status = "draft";

    if (meetingDate) {
      const meetingDt = new Date(meetingDate);
      if (meetingTime) {
        const [hours, minutes] = meetingTime.split(":").map(Number);
        meetingDt.setHours(hours || 0, minutes || 0, 0, 0);
      }
      if (meetingDt <= now) {
        status = "active";
      } else {
        status = "upcoming";
      }
    }

    const db = getDbPool();
    const result = await db.query(
      `INSERT INTO meetings (
        title, description, meeting_date, meeting_time, timezone,
        platform, meeting_link, meeting_id, passcode, dial_in_numbers,
        status, access_type, max_attendees, recording_link, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        meetingDate || null,
        meetingTime || null,
        timezone || "UTC",
        platform || "zoom",
        meetingLink || null,
        meetingId || null,
        passcode || null,
        dialInNumbers || null,
        status,
        accessType || "members_only",
        maxAttendees || null,
        recordingLink || null,
        auth.userId,
      ]
    );

    return res.status(201).json({ meeting: result.rows[0] });
  } catch (err) {
    console.error("Error creating meeting:", err);
    return res.status(500).json({ error: "Failed to create meeting." });
  }
});

// ─── PUT /api/meetings/:id (admin) ──────────────────────────────────────
meetingsRouter.put("/meetings/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const {
      title, description, meetingDate, meetingTime, timezone,
      platform, meetingLink, meetingId, passcode, dialInNumbers,
      accessType, maxAttendees, recordingLink,
    } = req.body;

    const db = getDbPool();

    const result = await db.query(
      `UPDATE meetings SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        meeting_date = COALESCE($3, meeting_date),
        meeting_time = COALESCE($4, meeting_time),
        timezone = COALESCE($5, timezone),
        platform = COALESCE($6, platform),
        meeting_link = COALESCE($7, meeting_link),
        meeting_id = COALESCE($8, meeting_id),
        passcode = COALESCE($9, passcode),
        dial_in_numbers = COALESCE($10, dial_in_numbers),
        access_type = COALESCE($11, access_type),
        max_attendees = COALESCE($12, max_attendees),
        recording_link = COALESCE($13, recording_link)
       WHERE id = $14 RETURNING *`,
      [
        title?.trim() || null,
        description !== undefined ? (description?.trim() || null) : null,
        meetingDate !== undefined ? meetingDate : null,
        meetingTime !== undefined ? meetingTime : null,
        timezone || null,
        platform || null,
        meetingLink !== undefined ? meetingLink : null,
        meetingId !== undefined ? meetingId : null,
        passcode !== undefined ? passcode : null,
        dialInNumbers !== undefined ? dialInNumbers : null,
        accessType || null,
        maxAttendees !== undefined ? maxAttendees : null,
        recordingLink !== undefined ? recordingLink : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    return res.json({ meeting: result.rows[0] });
  } catch (err) {
    console.error("Error updating meeting:", err);
    return res.status(500).json({ error: "Failed to update meeting." });
  }
});

// ─── PUT /api/meetings/:id/status (admin) ───────────────────────────────
meetingsRouter.put("/meetings/:id/status", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "upcoming", "active", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const db = getDbPool();
    const result = await db.query(
      "UPDATE meetings SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    return res.json({ meeting: result.rows[0] });
  } catch (err) {
    console.error("Error updating meeting status:", err);
    return res.status(500).json({ error: "Failed to update meeting status." });
  }
});

// ─── DELETE /api/meetings/:id (admin) ───────────────────────────────────
meetingsRouter.delete("/meetings/:id", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query("DELETE FROM meetings WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }
    return res.json({ message: "Meeting deleted." });
  } catch (err) {
    console.error("Error deleting meeting:", err);
    return res.status(500).json({ error: "Failed to delete meeting." });
  }
});

// ============================================================================
// MEETING ATTENDANCE
// ============================================================================

// ─── POST /api/meetings/:id/attend ─────────────────────────────────────
// Allows logged-in members or anonymous users (with name/email) to register attendance
meetingsRouter.post("/meetings/:id/attend", async (req: Request, res: Response) => {
  try {
    const db = getDbPool();
    const { id } = req.params;
    const { name, email } = req.body;

    // Check meeting exists and is active/upcoming
    const meetingResult = await db.query(
      "SELECT * FROM meetings WHERE id = $1",
      [id]
    );
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const meeting = meetingResult.rows[0];
    if (meeting.status === "cancelled") {
      return res.status(400).json({ error: "This meeting has been cancelled." });
    }
    if (meeting.status === "completed") {
      return res.status(400).json({ error: "This meeting has already ended." });
    }

    // Try to authenticate
    let userId: string | null = null;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
        userId = payload.userId;
      } catch { /* not authenticated */ }
    }

    // If access_type is members_only, require authentication
    if (meeting.access_type === "members_only" && !userId) {
      return res.status(401).json({ error: "Login required to join this meeting." });
    }

    // If user is authenticated, use their info
    let attendeeName = name || null;
    let attendeeEmail = email || null;

    if (userId) {
      const userResult = await db.query(
        "SELECT first_name, last_name, email FROM users WHERE id = $1",
        [userId]
      );
      if (userResult.rows.length > 0) {
        attendeeName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
        attendeeEmail = userResult.rows[0].email;
      }

      // Check for duplicate
      const existing = await db.query(
        "SELECT id FROM meeting_attendees WHERE meeting_id = $1 AND user_id = $2",
        [id, userId]
      );
      if (existing.rows.length > 0) {
        // Already registered, return the meeting link info
        return res.json({
          message: "Already registered.",
          meeting: {
            title: meeting.title,
            platform: meeting.platform,
            meeting_link: meeting.meeting_link,
            meeting_id: meeting.meeting_id,
            passcode: meeting.passcode,
            dial_in_numbers: meeting.dial_in_numbers,
          },
        });
      }
    }

    // Register attendance
    await db.query(
      `INSERT INTO meeting_attendees (meeting_id, user_id, name, email)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, attendeeName, attendeeEmail]
    );

    return res.json({
      message: "Attendance registered.",
      meeting: {
        title: meeting.title,
        platform: meeting.platform,
        meeting_link: meeting.meeting_link,
        meeting_id: meeting.meeting_id,
        passcode: meeting.passcode,
        dial_in_numbers: meeting.dial_in_numbers,
      },
    });
  } catch (err) {
    console.error("Error registering attendance:", err);
    return res.status(500).json({ error: "Failed to register attendance." });
  }
});

// ─── GET /api/meetings/:id/attendees (admin) ────────────────────────────
meetingsRouter.get("/meetings/:id/attendees", async (req: Request, res: Response) => {
  const auth = authenticate(req, res);
  if (!auth) return;
  if (!(await requireAdmin(auth, res))) return;

  try {
    const db = getDbPool();
    const result = await db.query(
      `SELECT ma.id, ma.user_id, ma.name, ma.email, ma.joined_at,
              u.first_name, u.last_name, u.membership_code
       FROM meeting_attendees ma
       LEFT JOIN users u ON u.id = ma.user_id
       WHERE ma.meeting_id = $1
       ORDER BY ma.joined_at DESC`,
      [req.params.id]
    );

    return res.json({ attendees: result.rows });
  } catch (err) {
    console.error("Error fetching attendees:", err);
    return res.status(500).json({ error: "Failed to fetch attendees." });
  }
});
