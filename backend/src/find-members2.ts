import "dotenv/config";
import { getDbPool } from "./db";

async function findMembers() {
  const db = getDbPool();
  const terms = ["Obitusin", "Ogunleye", "Ogunmade", "Adeyemi", "Gladys", "Ajibogun", "Bosun", "Shadare", "Awobajo"];

  for (const t of terms) {
    const r = await db.query(
      `SELECT id, first_name, last_name, email, membership_code
       FROM users
       WHERE LOWER(first_name) LIKE LOWER($1)
          OR LOWER(last_name) LIKE LOWER($1)
          OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1)`,
      [`%${t}%`]
    );
    if (r.rows.length > 0) {
      for (const u of r.rows) {
        console.log(`MATCH: ${t}  →  ${u.first_name} ${u.last_name} | ${u.email} | ${u.id} | ${u.membership_code || "—"}`);
      }
    } else {
      console.log(`NO MATCH: ${t}`);
    }
  }

  await db.end();
}

findMembers().catch(console.error);
