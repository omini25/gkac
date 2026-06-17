/**
 * Quick script to test ZeptoMail email sending.
 *
 * Usage:  npx tsx src/test-email.ts
 *
 * Make sure ZEPTOMAIL_TOKEN is set in your .env file.
 */

import "dotenv/config";
import { sendEmail } from "./email";

async function main() {
  const testEmail = process.argv[2] || process.env.ADMIN_EMAIL || "admin@gkac.org";

  console.log(`\nSending test email to: ${testEmail}`);
  console.log(`From: ${process.env.ZEPTOMAIL_FROM || "noreply@gkac.org"}`);
  console.log(`Token set: ${process.env.ZEPTOMAIL_TOKEN ? "✅ Yes" : "❌ No"}\n`);

  const success = await sendEmail({
    to: { address: testEmail, name: "Test Recipient" },
    subject: "🧪 ZeptoMail Test – GKAC",
    htmlBody: `
      <h2>ZeptoMail Integration Test</h2>
      <p>This is a test email from the <strong>GKAC</strong> backend.</p>
      <p>If you received this, the ZeptoMail integration is working correctly! ✅</p>
      <hr/>
      <p><em>Sent at: ${new Date().toISOString()}</em></p>
    `,
    textBody: `ZeptoMail Integration Test\n\nThis is a test email from the GKAC backend.\nIf you received this, the ZeptoMail integration is working correctly!\n\nSent at: ${new Date().toISOString()}`,
  });

  if (success) {
    console.log("✅ Test email sent successfully!\n");
  } else {
    console.log("❌ Failed to send test email. Check the error log above.\n");
  }

  process.exit(success ? 0 : 1);
}

main();
