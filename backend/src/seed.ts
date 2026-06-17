/**
 * GKAC Database Seed Script
 * ===========================
 * Run: npx tsx src/seed.ts
 *
 * Creates demo users with various application statuses,
 * an admin user, and corresponding payment records.
 *
 * All demo users have password: "Password123"
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDbPool } from "./db";

const SALT_ROUNDS = 12;

function randomRef(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function seed() {
  const db = getDbPool();

  // Test connection
  const ping = await db.query("SELECT NOW()");
  console.log("Connected:", ping.rows[0].now);

  // Check if we already have users
  const existing = await db.query("SELECT COUNT(*) FROM users");
  const count = parseInt(existing.rows[0].count, 10);
  const skipUsers = count > 0;
  if (skipUsers) {
    console.log(`Database already has ${count} users — skipping user seed.`);
  }

  // Fetch category IDs
  const cats = await db.query("SELECT id, name, fee_kobo FROM membership_categories ORDER BY sort_order");
  const catMap: Record<string, { id: string; fee_kobo: number }> = {};
  for (const row of cats.rows) {
    catMap[row.name] = row;
  }

  console.log("Categories loaded:", Object.keys(catMap));

  // Hash the demo password
  const hash = await bcrypt.hash("Password123", SALT_ROUNDS);
  console.log("Password hash generated for 'Password123'");

  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const elevenMonthsFromNow = new Date(now.getTime() + 330 * 24 * 60 * 60 * 1000);

  // ──────────────────────────────────────────────────────────────
  // DEMO USERS
  // ──────────────────────────────────────────────────────────────

  const users = [
    {
      label: "1. Approved Full Member (active, paid, verified)",
      firstName: "Adebayo", lastName: "Ogunlesi", email: "adebayo@example.com",
      phone: "+234 801 111 0001", dob: "1985-04-12", gender: "Male",
      state: "Lagos", lga: "Ikeja", address: "42 Bourdillon Road, Ikoyi, Lagos",
      nin: "12345678901", category: "Full Member",
      status: "approved", verified: true,
      membershipCode: "MEM-2025-00001",
      expiresAt: elevenMonthsFromNow,
      referral: "Dr. Emeka Nwosu",
      isAdmin: false,
    },
    {
      label: "2. Approved Fellow (senior, active)",
      firstName: "Fatima", lastName: "Sani-Idris", email: "fatima@example.com",
      phone: "+234 802 222 0002", dob: "1972-09-23", gender: "Female",
      state: "FCT (Abuja)", lga: "Municipal Area Council",
      address: "15 Danube Street, Maitama, Abuja",
      nin: "23456789012", category: "Fellow",
      status: "approved", verified: true,
      membershipCode: "MEM-2025-00002",
      expiresAt: elevenMonthsFromNow,
      referral: "",
      isAdmin: false,
    },
    {
      label: "3. Pending Approval (paid, awaiting admin review)",
      firstName: "Chidi", lastName: "Okeke", email: "chidi@example.com",
      phone: "+234 803 333 0003", dob: "1990-12-01", gender: "Male",
      state: "Anambra", lga: "Awka", address: "8 Zik Avenue, Awka",
      nin: "34567890123", category: "Associate",
      status: "pending_approval", verified: true,
      membershipCode: "MEM-2025-00003",
      expiresAt: elevenMonthsFromNow,
      referral: "Adebayo Ogunlesi",
      isAdmin: false,
    },
    {
      label: "4. Pending Payment (registered, not yet paid)",
      firstName: "Yetunde", lastName: "Adebisi", email: "yetunde@example.com",
      phone: "+234 804 444 0004", dob: "1995-07-15", gender: "Female",
      state: "Oyo", lga: "Ibadan North",
      address: "23 Ring Road, Ibadan",
      nin: "45678901234", category: "Graduate",
      status: "pending_payment", verified: false,
      membershipCode: null,
      expiresAt: null,
      referral: "",
      isAdmin: false,
    },
    {
      label: "5. Rejected applicant",
      firstName: "Musa", lastName: "Bello", email: "musa@example.com",
      phone: "+234 805 555 0005", dob: "1988-03-09", gender: "Male",
      state: "Kano", lga: "Nasarawa", address: "17 Sultan Road, Kano",
      nin: "56789012345", category: "Full Member",
      status: "rejected", verified: false,
      membershipCode: null,
      expiresAt: null,
      referral: "",
      isAdmin: false,
    },
    {
      label: "6. Student member (approved, active)",
      firstName: "Nkechi", lastName: "Eze", email: "nkechi@example.com",
      phone: "+234 806 666 0006", dob: "2001-11-30", gender: "Female",
      state: "Enugu", lga: "Enugu North",
      address: "5 Presidential Road, Enugu",
      nin: "", altIDType: "Voter's Card", altIDNum: "VCR-87654321",
      category: "Student",
      status: "approved", verified: true,
      membershipCode: "MEM-2025-00004",
      expiresAt: elevenMonthsFromNow,
      referral: "Fatima Sani-Idris",
      isAdmin: false,
    },
    {
      label: "7. ADMIN — Super Admin",
      firstName: "Admin", lastName: "User", email: "admin@gkac.org",
      phone: "+234 800 000 0000", dob: "1980-01-01", gender: "Male",
      state: "Lagos", lga: "Ikeja", address: "1 GKAC House, Secretariat, Ikeja, Lagos",
      nin: "99999999999", category: "Fellow",
      status: "approved", verified: true,
      membershipCode: "ADM-2025-00001",
      expiresAt: new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years
      referral: "",
      isAdmin: true,
    },
    {
      label: "8. Expired member (can still log in to renew)",
      firstName: "Oluwaseun", lastName: "Akinlade", email: "seun@example.com",
      phone: "+234 807 777 0007", dob: "1992-06-20", gender: "Male",
      state: "Ogun", lga: "Abeokuta North",
      address: "10 Quarry Road, Abeokuta",
      nin: "67890123456", category: "Associate",
      status: "approved", verified: true,
      membershipCode: "MEM-2024-00005",
      expiresAt: twoMonthsAgo, // Expired 2 months ago
      referral: "",
      isAdmin: false,
    },
  ];

  if (skipUsers) {
    console.log("Skipping user creation.");
  } else {
  for (const u of users) {
    // Get category fee
    const cat = catMap[u.category];
    if (!cat) {
      console.error(`Category "${u.category}" not found — skipping user ${u.email}`);
      continue;
    }

    const userResult = await db.query(
      `INSERT INTO users (
        first_name, last_name, email, phone, date_of_birth, gender,
        state_of_origin, lga, residential_address,
        password_hash, membership_category_id, membership_category_name,
        nin, alt_id_type, alt_id_num, referral_name,
        membership_code, application_status, is_verified,
        is_admin, membership_expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING id, email, application_status, membership_code`,
      [
        u.firstName, u.lastName, u.email, u.phone, u.dob, u.gender,
        u.state, u.lga, u.address,
        hash, cat.id, u.category,
        u.nin || null,
        (u as any).altIDType || null,
        (u as any).altIDNum || null,
        u.referral || null,
        u.membershipCode,
        u.status,
        u.verified,
        u.isAdmin,
        u.expiresAt,
      ]
    );

    const userRow = userResult.rows[0];
    const label = `  ${u.label}`;

    // Create payment records for users who have paid (not pending_payment)
    if (u.status !== "pending_payment") {
      const paidDate = u.status === "rejected"
        ? threeMonthsAgo
        : u.status === "approved" && u.membershipCode?.startsWith("MEM-2024")
          ? twoMonthsAgo  // expired member
          : oneMonthAgo;

      const payRef = randomRef("GKD");
      const payStatus = u.status === "rejected" ? "success" : "success";

      await db.query(
        `INSERT INTO payments (user_id, amount_kobo, currency, reference, status, payment_type, paid_at, metadata)
         VALUES ($1, $2, 'NGN', $3, $4, 'registration', $5, $6)`,
        [
          userRow.id,
          cat.fee_kobo,
          payRef,
          payStatus,
          paidDate,
          JSON.stringify({ category: u.category, seeded: true }),
        ]
      );
      console.log(`${label} — payment ${payRef} (₦${(cat.fee_kobo / 100).toLocaleString()})`);
    } else {
      console.log(`${label} — no payment (pending_payment)`);
    }
  }
  } // end else (skipUsers)

  if (!skipUsers) {
  console.log("\n✅ Seed complete!");
  }
  console.log("\n📋 Demo credentials:");
  console.log("   All users password: Password123");
  console.log("   ─────────────────────────────────────────────");
  console.log("   Admin:      admin@gkac.org");
  console.log("   Approved:   adebayo@example.com");
  console.log("   Approved:   fatima@example.com");
  console.log("   Pending:    chidi@example.com");
  console.log("   Unpaid:     yetunde@example.com");
  console.log("   Rejected:   musa@example.com");
  console.log("   Student:    nkechi@example.com");
  console.log("   Expired:    seun@example.com");

  // ══════════════════════════════════════════════════════════════
  // SEED ELECTIONS DATA
  // ══════════════════════════════════════════════════════════════

  // Check if elections already exist
  const existingElections = await db.query("SELECT COUNT(*) FROM elections");
  if (parseInt(existingElections.rows[0].count, 10) > 0) {
    console.log("Elections already exist — skipping election seed.");
  } else {
    // Fetch admin user and approved members
    const adminResult = await db.query("SELECT id FROM users WHERE email = 'admin@gkac.org'");
    const adminId = adminResult.rows[0]?.id;

    const membersResult = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE application_status = 'approved' AND is_admin = FALSE"
    );
    const members = membersResult.rows;

    // 1. Create an ACTIVE election
    const activeElectionResult = await db.query(
      `INSERT INTO elections (title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        "GKAC Executive Committee Elections 2025",
        "Vote for President, Vice President, General Secretary, and Treasurer",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // started 7 days ago
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // ends in 14 days
        "active",
        adminId,
      ]
    );
    const activeElection = activeElectionResult.rows[0];
    console.log(`  Created active election: ${activeElection.title} (${activeElection.id})`);

    // Positions for active election
    const positions = [
      { title: "President", description: "Head of the Governing Council", sortOrder: 1 },
      { title: "Vice President", description: "Deputy Head of the Governing Council", sortOrder: 2 },
      { title: "General Secretary", description: "Secretary to the Governing Council", sortOrder: 3 },
      { title: "Treasurer", description: "Financial oversight", sortOrder: 4 },
    ];

    const positionIds: string[] = [];
    for (const pos of positions) {
      const posResult = await db.query(
        `INSERT INTO election_positions (election_id, title, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *`,
        [activeElection.id, pos.title, pos.description, pos.sortOrder]
      );
      positionIds.push(posResult.rows[0].id);
      console.log(`    Added position: ${pos.title}`);
    }

    // Create candidates from members
    for (let i = 0; i < Math.min(members.length, positionIds.length); i++) {
      const member = members[i];
      const posId = positionIds[i];

      // Create declarations (auto-approved)
      await db.query(
        `INSERT INTO election_declarations (election_id, position_id, user_id, statement, status, reviewed_by, reviewed_at)
         VALUES ($1, $2, $3, $4, 'approved', $5, NOW())`,
        [
          activeElection.id, posId, member.id,
          `I am committed to serving the GKAC community with integrity and excellence.`,
          adminId,
        ]
      );

      // Add as candidate
      await db.query(
        `INSERT INTO election_candidates (election_id, position_id, user_id, statement, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [activeElection.id, posId, member.id, `Committed to serving GKAC with integrity.`, 0]
      );

      // Cast a vote from admin for each position (to seed some votes)
      const candResult = await db.query(
        "SELECT id FROM election_candidates WHERE position_id = $1 AND election_id = $2 LIMIT 1",
        [posId, activeElection.id]
      );
      if (candResult.rows.length > 0 && adminId) {
        await db.query(
          `INSERT INTO election_votes (election_id, position_id, voter_id, candidate_id)
           VALUES ($1, $2, $3, $4) ON CONFLICT (position_id, voter_id) DO NOTHING`,
          [activeElection.id, posId, adminId, candResult.rows[0].id]
        );
      }

      console.log(`    Candidate: ${member.first_name} ${member.last_name} for ${positions[i].title}`);
    }

    // 2. Create an UPCOMING election
    const upcomingResult = await db.query(
      `INSERT INTO elections (title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        "Lagos Chapter Executive Elections",
        "Chapter Chair, Secretary, and Committee Members",
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        new Date(Date.now() + 44 * 24 * 60 * 60 * 1000),
        "upcoming",
        adminId,
      ]
    );
    const upcomingElection = upcomingResult.rows[0];
    console.log(`  Created upcoming election: ${upcomingElection.title}`);

    // Add positions for upcoming
    const upcomingPositions = [
      { title: "Chapter Chair", sortOrder: 1 },
      { title: "Chapter Secretary", sortOrder: 2 },
      { title: "Committee Member", sortOrder: 3 },
    ];
    for (const pos of upcomingPositions) {
      await db.query(
        `INSERT INTO election_positions (election_id, title, sort_order) VALUES ($1, $2, $3)`,
        [upcomingElection.id, pos.title, pos.sortOrder]
      );
      console.log(`    Added position: ${pos.title}`);
    }

    // 3. Create a CLOSED election
    const closedResult = await db.query(
      `INSERT INTO elections (title, description, start_date, end_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        "CPD Committee Representative Election",
        "Elect a CPD committee representative",
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 46 * 24 * 60 * 60 * 1000),
        "closed",
        adminId,
      ]
    );
    const closedElection = closedResult.rows[0];
    console.log(`  Created closed election: ${closedElection.title}`);

    // Add position and candidates for closed election
    const closedPosResult = await db.query(
      `INSERT INTO election_positions (election_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [closedElection.id, "CPD Representative", 1]
    );
    const closedPosId = closedPosResult.rows[0].id;

    if (members.length >= 3) {
      for (let i = 0; i < 3; i++) {
        const member = members[i];
        await db.query(
          `INSERT INTO election_declarations (election_id, position_id, user_id, statement, status, reviewed_by, reviewed_at)
           VALUES ($1, $2, $3, $4, 'approved', $5, NOW())`,
          [closedElection.id, closedPosId, member.id, `I want to represent CPD interests.`, adminId]
        );
        await db.query(
          `INSERT INTO election_candidates (election_id, position_id, user_id, statement, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [closedElection.id, closedPosId, member.id, `Representing CPD interests.`, i]
        );
      }

      // Cast votes to simulate the election
      const candsForClosed = await db.query(
        "SELECT id FROM election_candidates WHERE position_id = $1 ORDER BY sort_order",
        [closedPosId]
      );
      const candIds = candsForClosed.rows.map((r: any) => r.id);

      // Simulate votes from members
      for (let vi = 0; vi < members.length && vi < candIds.length; vi++) {
        const member = members[vi];
        // Vote for the candidate, cycling through
        const targetCand = candIds[vi % candIds.length];
        await db.query(
          `INSERT INTO election_votes (election_id, position_id, voter_id, candidate_id)
           VALUES ($1, $2, $3, $4) ON CONFLICT (position_id, voter_id) DO NOTHING`,
          [closedElection.id, closedPosId, member.id, targetCand]
        );
      }

      // Cast some additional votes from admin to make counts interesting
      if (adminId) {
        await db.query(
          `INSERT INTO election_votes (election_id, position_id, voter_id, candidate_id)
           VALUES ($1, $2, $3, $4) ON CONFLICT (position_id, voter_id) DO NOTHING`,
          [closedElection.id, closedPosId, adminId, candIds[0]]
        );
      }
    }

    console.log("\n✅ Election seed complete!");
  }

  await db.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
