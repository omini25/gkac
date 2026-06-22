import "dotenv/config";
import { getDbPool } from "./db";

async function findMembers() {
  const db = getDbPool();
  const names: [string, string][] = [
    ["Ola", "Obitusin"],
    ["Arigbede", "Idowu"],
    ["Tolu", "Igbojionu"],
    ["Gladys Abimbola", "Adeyemi"],
    ["Babajide", "Ogunleye"],
    ["Abayomi", "Awobajo"],
    ["Sunday", "Ogunmade"],
    ["Olatubosun", "Ajibogun"],
    ["Samson Ade", "Onipede"],
    ["Akanji", "Shadare"],
  ];

  for (const [first, last] of names) {
    const result = await db.query(
      `SELECT id, first_name, last_name, email, membership_code, membership_category_name
       FROM users
       WHERE LOWER(first_name) LIKE LOWER($1)
         AND LOWER(last_name) LIKE LOWER($2)`,
      [`%${first}%`, `%${last}%`]
    );
    if (result.rows.length > 0) {
      const u = result.rows[0];
      console.log(`FOUND: ${first} ${last}  →  ${u.id} | ${u.first_name} ${u.last_name} | ${u.email} | ${u.membership_code || "—"}`);
    } else {
      // Try searching full name
      const result2 = await db.query(
        `SELECT id, first_name, last_name, email, membership_code, membership_category_name
         FROM users
         WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE LOWER($1)`,
        [`%${first} ${last}%`]
      );
      if (result2.rows.length > 0) {
        const u = result2.rows[0];
        console.log(`FOUND (fuzzy): ${first} ${last}  →  ${u.id} | ${u.first_name} ${u.last_name} | ${u.email} | ${u.membership_code || "—"}`);
      } else {
        console.log(`NOT FOUND: ${first} ${last}`);
      }
    }
  }

  await db.end();
}

findMembers().catch(console.error);
