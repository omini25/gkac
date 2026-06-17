/**
 * Database Migration Runner
 * ==========================
 * Run: npx tsx src/migrate.ts
 *
 * Applies SQL migration files in order.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const SQL_DIR = path.join(__dirname, "..", "sql");

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Get list of SQL files in order
  const files = fs.readdirSync(SQL_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`Running: ${file}`);
    const sql = fs.readFileSync(path.join(SQL_DIR, file), "utf-8");

    try {
      await pool.query(sql);
      console.log(`  ✅ ${file} applied successfully`);
    } catch (err) {
      console.error(`  ❌ ${file} failed:`, err);
      // Continue with next file
    }
  }

  await pool.end();
  console.log("\n✅ Migrations complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
