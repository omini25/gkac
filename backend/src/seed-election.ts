/**
 * GKAC Election Seed Script
 * ===========================
 * Run: npx tsx src/seed-election.ts
 *
 * Creates an election with positions and candidates using existing members.
 * For any members not found in the database, new user accounts are created.
 *
 * Candidates:
 *   - Ola Obitusin → President
 *   - Olatubosun Ajibogun → President
 *   - Arigbede Idowu → Vice President
 *   - Tolu Igbojionu → Assistant General Secretary
 *   - Gladys Abimbola Adeyemi → Financial Secretary
 *   - Babajide Ogunleye → Global Marshall
 *   - Abayomi Awobajo → Treasurer
 *   - Sunday Ogunmade → Public Relations Officer
 *   - Samson Ade Onipede → General Secretary
 *   - Akanji Shadare → Social Secretary
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDbPool } from "./db";
import crypto from "crypto";

const SALT_ROUNDS = 12;

// ─── Candidate definitions ────────────────────────────────────────────────
interface CandidateDef {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
}

const CANDIDATES: CandidateDef[] = [
  { firstName: "Ola", lastName: "Obitusin", email: "ola.obitusin@gkac.org", position: "President" },
  { firstName: "Bosun", lastName: "Ajibogun", email: "bosun.ajibogun@gkac.org", position: "President" },
  { firstName: "Arigbede", lastName: "Idowu", email: "arigbede.idowu@gkac.org", position: "Vice President" },
  { firstName: "Tolulope", lastName: "Igbojionu", email: "tolulope.igbojionu@gkac.org", position: "Assistant General Secretary" },
  { firstName: "Gladys Abimbola", lastName: "Adeyemi", email: "gladys.adeyemi@gkac.org", position: "Financial Secretary" },
  { firstName: "Babajide", lastName: "Ogunleye", email: "babajide.ogunleye@gkac.org", position: "Global Marshall" },
  { firstName: "Awobajo", lastName: "Abayomi", email: "awobajo.abayomi@gkac.org", position: "Treasurer" },
  { firstName: "Sunday", lastName: "Ogunmade", email: "sunday.ogunmade@gkac.org", position: "Public Relations Officer" },
  { firstName: "Samson", lastName: "Ade Onipede", email: "samson.onipede@gkac.org", position: "General Secretary" },
  { firstName: "Shadare", lastName: "Akanji", email: "shadare.akanji@gkac.org", position: "Social Secretary" },
];

// Deduplicate positions
const POSITIONS = [...new Set(CANDIDATES.map((c) => c.position))];

async function seedElection() {
  const db = getDbPool();
  const ping = await db.query("SELECT NOW()");
  console.log("Connected:", ping.rows[0].now);

  const hash = await bcrypt.hash("0000", SALT_ROUNDS);
  const adminResult = await db.query("SELECT id FROM users WHERE is_admin = TRUE LIMIT 1");
  const adminId = adminResult.rows[0]?.id;
  if (!adminId) {
    console.error("No admin user found. Run seed.ts first.");
    process.exit(1);
  }

  // Get membership category
  const catResult = await db.query(
    "SELECT id, name, fee_kobo FROM membership_categories ORDER BY sort_order LIMIT 1"
  );
  const defaultCat = catResult.rows[0];
  if (!defaultCat) {
    console.error("No membership categories found.");
    process.exit(1);
  }

  // ── 1. Find or create users ─────────────────────────────────────────────
  const userIds: Record<string, string> = {};

  for (const c of CANDIDATES) {
    // Look up by email first
    let user = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE LOWER(email) = LOWER($1)",
      [c.email]
    );

    if (user.rows.length === 0) {
      // Try by name
      user = await db.query(
        `SELECT id, first_name, last_name, email FROM users
         WHERE LOWER(first_name) LIKE LOWER($1) AND LOWER(last_name) LIKE LOWER($2)`,
        [`%${c.firstName}%`, `%${c.lastName}%`]
      );
    }

    if (user.rows.length > 0) {
      const u = user.rows[0];
      userIds[c.position + "|" + c.firstName + " " + c.lastName] = u.id;
      console.log(`  ✓ Found: ${c.firstName} ${c.lastName} → ${u.email} (${u.id})`);
    } else {
      // Create new user
      const membershipCode = `MEM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const newUser = await db.query(
        `INSERT INTO users (
          first_name, last_name, email, phone, password_hash,
          membership_category_id, membership_category_name,
          membership_code, application_status, is_verified,
          is_admin, membership_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved', TRUE, FALSE, $9)
        RETURNING id`,
        [
          c.firstName, c.lastName, c.email.toLowerCase(),
          "+234 800 000 0000", hash,
          defaultCat.id, defaultCat.name,
          membershipCode, expiresAt,
        ]
      );
      userIds[c.position + "|" + c.firstName + " " + c.lastName] = newUser.rows[0].id;
      console.log(`  ✓ Created: ${c.firstName} ${c.lastName} → ${c.email} (${newUser.rows[0].id})`);
    }
  }

  // ── 2. Create the election ──────────────────────────────────────────────
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const endDate = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days after start

  const electionResult = await db.query(
    `INSERT INTO elections (title, description, start_date, end_date, status, eligible_roles, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      "GKAC National Executive Council Elections 2026",
      "Election of the National Executive Council (NEC) members for the 2026-2028 tenure. All approved financial members are eligible to vote.",
      startDate.toISOString(),
      endDate.toISOString(),
      "upcoming",
      ["Member", "Fellow", "Associate", "Graduate", "Student"],
      adminId,
    ]
  );
  const electionId = electionResult.rows[0].id;
  console.log(`\n  ✓ Election created: ${electionId}`);

  // ── 3. Create positions ─────────────────────────────────────────────────
  const positionDefs: { title: string; description: string; sortOrder: number }[] = [
    { title: "President", description: "The President serves as the chief executive officer of the club.", sortOrder: 1 },
    { title: "Vice President", description: "The Vice President assists the President and assumes duties in their absence.", sortOrder: 2 },
    { title: "General Secretary", description: "The General Secretary oversees all administrative and secretarial functions.", sortOrder: 3 },
    { title: "Assistant General Secretary", description: "The Assistant General Secretary supports the General Secretary.", sortOrder: 4 },
    { title: "Financial Secretary", description: "The Financial Secretary manages the financial records of the club.", sortOrder: 5 },
    { title: "Treasurer", description: "The Treasurer manages club funds and financial operations.", sortOrder: 6 },
    { title: "Social Secretary", description: "The Social Secretary plans and coordinates social activities.", sortOrder: 7 },
    { title: "Public Relations Officer", description: "The PRO manages the club's public image and communications.", sortOrder: 8 },
    { title: "Global Marshall", description: "The Global Marshall oversees discipline and order within the club.", sortOrder: 9 },
  ];

  const positionIds: Record<string, string> = {};

  for (const pd of positionDefs) {
    const result = await db.query(
      `INSERT INTO election_positions (election_id, title, description, max_candidates, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [electionId, pd.title, pd.description, 3, pd.sortOrder]
    );
    positionIds[pd.title] = result.rows[0].id;
    console.log(`  ✓ Position: ${pd.title} (${result.rows[0].id})`);
  }

  // ── 4. Create declarations & candidates ─────────────────────────────────
  for (const c of CANDIDATES) {
    const userId = userIds[c.position + "|" + c.firstName + " " + c.lastName];
    const positionId = positionIds[c.position];

    if (!userId || !positionId) {
      console.error(`  ✗ Cannot create candidate for ${c.firstName} ${c.lastName} → ${c.position}`);
      continue;
    }

    // Create declaration
    const declResult = await db.query(
      `INSERT INTO election_declarations (election_id, position_id, user_id, statement, status, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4, 'approved', $5, NOW())
       ON CONFLICT (position_id, user_id) DO NOTHING
       RETURNING id`,
      [
        electionId,
        positionId,
        userId,
        `I, ${c.firstName} ${c.lastName}, hereby declare my interest to serve as ${c.position}.`,
        adminId,
      ]
    );

    if (declResult.rows.length > 0) {
      // Create candidate from declaration
      await db.query(
        `INSERT INTO election_candidates (election_id, position_id, user_id, declaration_id, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (position_id, user_id) DO NOTHING`,
        [electionId, positionId, userId, declResult.rows[0].id, 1]
      );
      console.log(`  ✓ Candidate: ${c.firstName} ${c.lastName} → ${c.position}`);
    } else {
      // Maybe already exists - try inserting candidate directly
      await db.query(
        `INSERT INTO election_candidates (election_id, position_id, user_id, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (position_id, user_id) DO NOTHING`,
        [electionId, positionId, userId, 1]
      );
      console.log(`  ✓ Candidate (existing): ${c.firstName} ${c.lastName} → ${c.position}`);
    }
  }

  console.log("\n✅ Election seed complete!");
  console.log(`   Election ID: ${electionId}`);
  console.log(`   Status: Upcoming (starts ${startDate.toLocaleDateString()})`);
  console.log(`   Positions: ${POSITIONS.length}`);
  console.log(`   Candidates: ${CANDIDATES.length}`);
  console.log(`\n   Default password for new accounts: 0000`);

  await db.end();
}

seedElection().catch((err) => {
  console.error("Election seed failed:", err);
  process.exit(1);
});
