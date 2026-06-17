import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export function getDbPool(): Pool {
  return pool;
}

export async function testDbConnection(db: Pool): Promise<void> {
  try {
    const client = await db.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("PostgreSQL connected:", result.rows[0].now);
  } catch (err) {
    console.error("PostgreSQL connection failed:", err);
  }
}
