/**
 * GKAC Member Seed Script — Development Levy 2026 Members
 * ==========================================================
 * Run: npx tsx src/seed-members.ts
 *
 * Creates 46 member profiles with default password "0000"
 * and force_password_change = TRUE.
 *
 * Each member is pre-marked with their developmental levy amount.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDbPool } from "./db";

const SALT_ROUNDS = 12;

interface MemberSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  levyAmount: number; // in Naira
}

const MEMBERS: MemberSeed[] = [
  { firstName: "Bosun", lastName: "Ajibogun", email: "bosun.ajibogun@gkac.org", phone: "07030000001", levyAmount: 50000 },
  { firstName: "Arigbede", lastName: "Idowu", email: "arigbede.idowu@gkac.org", phone: "07030000002", levyAmount: 50000 },
  { firstName: "Margaret", lastName: "Balogun", email: "margaret.balogun@gkac.org", phone: "07030000003", levyAmount: 50000 },
  { firstName: "Fadejimi", lastName: "Falade", email: "fadejimi.falade@gkac.org", phone: "07030000004", levyAmount: 50000 },
  { firstName: "Femi", lastName: "Adenekan", email: "femi.adenekan@gkac.org", phone: "07030000005", levyAmount: 50000 },
  { firstName: "Babatunde", lastName: "Adebayo", email: "babatunde.adebayo@gkac.org", phone: "07030000006", levyAmount: 50000 },
  { firstName: "Bamgbade", lastName: "Shadrach", email: "bamgbade.shadrach@gkac.org", phone: "07030000007", levyAmount: 50000 },
  { firstName: "Esther", lastName: "Idowu Faniyi", email: "esther.faniyi@gkac.org", phone: "07030000008", levyAmount: 50000 },
  { firstName: "Adetayo", lastName: "Adelaja", email: "adetayo.adelaja@gkac.org", phone: "07030000009", levyAmount: 50000 },
  { firstName: "Ojuade", lastName: "Bola Jubril", email: "ojuade.jubril@gkac.org", phone: "07030000010", levyAmount: 50000 },
  { firstName: "Kunle", lastName: "Obijimi", email: "kunle.obijimi@gkac.org", phone: "07030000011", levyAmount: 50000 },
  { firstName: "Shadare", lastName: "Akanji", email: "shadare.akanji@gkac.org", phone: "07030000012", levyAmount: 50000 },
  { firstName: "Sunday", lastName: "Famose", email: "sunday.famose@gkac.org", phone: "07030000013", levyAmount: 50000 },
  { firstName: "Oluwafemi", lastName: "Alonge", email: "oluwafemi.alonge@gkac.org", phone: "07030000014", levyAmount: 50000 },
  { firstName: "Akinyemi", lastName: "Olusegun", email: "akinyemi.olusegun@gkac.org", phone: "07030000015", levyAmount: 50000 },
  { firstName: "Alo", lastName: "Edward", email: "alo.edward@gkac.org", phone: "07030000016", levyAmount: 200000 },
  { firstName: "Kamal", lastName: "Bayewu", email: "kamal.bayewu@gkac.org", phone: "07030000017", levyAmount: 50000 },
  { firstName: "Adetunji", lastName: "Onamade", email: "adetunji.onamade@gkac.org", phone: "07030000018", levyAmount: 50000 },
  { firstName: "Oyinloye", lastName: "Olayemi Olakunle", email: "oyinloye.olakunle@gkac.org", phone: "07030000019", levyAmount: 50000 },
  { firstName: "Ojajuni", lastName: "Rahman Modupe", email: "ojajuni.rahman@gkac.org", phone: "07030000020", levyAmount: 100000 },
  { firstName: "Afolabi", lastName: "Taiwo", email: "afolabi.taiwo@gkac.org", phone: "07030000021", levyAmount: 100000 },
  { firstName: "Gbenga", lastName: "Oladosu", email: "gbenga.oladosu@gkac.org", phone: "07030000022", levyAmount: 50000 },
  { firstName: "Oluyinka", lastName: "Olujimi", email: "oluyinka.olujimi@gkac.org", phone: "07030000023", levyAmount: 50000 },
  { firstName: "Adegbola", lastName: "Adetokunboh", email: "adegbola.adetokunboh@gkac.org", phone: "07030000024", levyAmount: 100000 },
  { firstName: "Bamgbade", lastName: "Femi", email: "bamgbade.femi@gkac.org", phone: "07030000025", levyAmount: 50000 },
  { firstName: "Kolawole", lastName: "Ijaoba", email: "kolawole.ijaoba@gkac.org", phone: "07030000026", levyAmount: 50000 },
  { firstName: "Abubakri", lastName: "Anderson A", email: "abubakri.anderson@gkac.org", phone: "07030000027", levyAmount: 50000 },
  { firstName: "Bolanle", lastName: "Olaoye", email: "bolanle.olaoye@gkac.org", phone: "07030000028", levyAmount: 50000 },
  { firstName: "Olajide", lastName: "Joseph Olatunbosun", email: "olajide.olatunbosun@gkac.org", phone: "07030000029", levyAmount: 50000 },
  { firstName: "Lateef", lastName: "Ahmed", email: "lateef.ahmed@gkac.org", phone: "07030000030", levyAmount: 50000 },
  { firstName: "Shina", lastName: "Ajayi", email: "shina.ajayi@gkac.org", phone: "07030000031", levyAmount: 50000 },
  { firstName: "Awobajo", lastName: "Abayomi", email: "awobajo.abayomi@gkac.org", phone: "07030000032", levyAmount: 50000 },
  { firstName: "Babatunde", lastName: "Aregbesola", email: "babatunde.aregbesola@gkac.org", phone: "07030000033", levyAmount: 50000 },
  { firstName: "Temitop", lastName: "Omoshola", email: "temitop.omoshola@gkac.org", phone: "07030000034", levyAmount: 100000 },
  { firstName: "Taiwo", lastName: "Azeez", email: "taiwo.azeez@gkac.org", phone: "07030000035", levyAmount: 50000 },
  { firstName: "Wale", lastName: "Fakorede", email: "wale.fakorede@gkac.org", phone: "07030000036", levyAmount: 50000 },
  { firstName: "Olurin", lastName: "Oyewole", email: "olurin.oyewole@gkac.org", phone: "07030000037", levyAmount: 50000 },
  { firstName: "Olasoji", lastName: "Akanji", email: "olasoji.akanji@gkac.org", phone: "07030000038", levyAmount: 50000 },
  { firstName: "Tolulope", lastName: "Igbojionu", email: "tolulope.igbojionu@gkac.org", phone: "07030000039", levyAmount: 50000 },
  { firstName: "Samson", lastName: "Ade Onipede", email: "samson.onipede@gkac.org", phone: "07030000040", levyAmount: 50000 },
  { firstName: "Adeola", lastName: "Adekunle R", email: "adeola.adekunle@gkac.org", phone: "07030000041", levyAmount: 50000 },
  { firstName: "Adedayo", lastName: "M Adedeji", email: "adedayo.adedeji@gkac.org", phone: "07030000042", levyAmount: 50000 },
  { firstName: "Babatunde", lastName: "Adesanya", email: "babatunde.adesanya@gkac.org", phone: "07030000043", levyAmount: 50000 },
  { firstName: "Abiodun", lastName: "Ojelade", email: "abiodun.ojelade@gkac.org", phone: "07030000044", levyAmount: 50000 },
  { firstName: "Olutayo", lastName: "Thomas", email: "olutayo.thomas@gkac.org", phone: "07030000045", levyAmount: 50000 },
  { firstName: "Rahman", lastName: "Taofiki", email: "rahman.taofiki@gkac.org", phone: "07030000046", levyAmount: 50000 },
];

async function seedMembers() {
  const db = getDbPool();

  // Test connection
  const ping = await db.query("SELECT NOW()");
  console.log("Connected:", ping.rows[0].now);

  // Hash the default password
  const hash = await bcrypt.hash("0000", SALT_ROUNDS);
  console.log("Password hash generated for '0000'");

  let created = 0;
  let skipped = 0;

  for (const m of MEMBERS) {
    // Check if email already exists
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [m.email.toLowerCase()]);
    if (existing.rows.length > 0) {
      console.log(`  SKIP: ${m.email} already exists`);
      skipped++;
      continue;
    }

    // Generate membership code
    const year = new Date().getFullYear();
    const random = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
    const membershipCode = `MEM-${year}-${random}`;

    // Set expiry: 12 months from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.query(
      `INSERT INTO users (
        first_name, last_name, email, phone,
        password_hash, application_status, is_verified,
        membership_code, membership_expires_at,
        membership_category_name,
        force_password_change,
        annual_developmental_fee_paid,
        developmental_levy_amount,
        annual_developmental_fee_year
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        m.firstName,
        m.lastName,
        m.email.toLowerCase(),
        m.phone,
        hash,
        "approved",
        true,
        membershipCode,
        expiresAt,
        "Member",
        true, // force_password_change
        true, // annual_developmental_fee_paid
        m.levyAmount * 100, // store in kobo
        year,
      ]
    );

    console.log(`  CREATED: ${m.firstName} ${m.lastName} (${m.email}) — Levy: ₦${m.levyAmount.toLocaleString()}`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Total: ${MEMBERS.length}`);
}

seedMembers().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
