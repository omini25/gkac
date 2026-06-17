/**
 * ZeptoMail email service.
 *
 * Uses the ZeptoMail REST API (https://www.zeptomail.com/) to send
 * transactional emails.  Requires the following environment variables:
 *
 *   ZEPTOMAIL_TOKEN   – "Send Mail" API token from the ZeptoMail dashboard
 *   ZEPTOMAIL_FROM     – Verified sender address (e.g. noreply@gkac.org)
 *   ZEPTOMAIL_FROM_NAME – Sender display name (optional, defaults to "GKAC")
 *
 * API reference: https://www.zeptomail.com/docs/api/send-mail
 */

const ZEPTOMAIL_API = "https://api.zeptomail.com/v1.1/email";

const TOKEN = process.env.ZEPTOMAIL_TOKEN || "";
const FROM_ADDRESS = process.env.ZEPTOMAIL_FROM || "noreply@gkac.org";
const FROM_NAME = process.env.ZEPTOMAIL_FROM_NAME || "GKAC";

export interface EmailRecipient {
  address: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
}

/**
 * Send an email via the ZeptoMail API.
 *
 * Returns `true` on success, `false` on failure (logged to console).
 * This service is **fire-and-forget** — callers should not await the result
 * unless they specifically need to know the outcome.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!TOKEN) {
    console.warn("[email] ZEPTOMAIL_TOKEN is not set — email not sent.");
    console.log(`[email] Would have sent "${opts.subject}" to:`, opts.to);
    return false;
  }

  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];

  const body: Record<string, unknown> = {
    from: { address: FROM_ADDRESS, name: FROM_NAME },
    to: recipients.map((r) => ({
      email_address: { address: r.address, name: r.name || r.address },
    })),
    subject: opts.subject,
  };

  if (opts.htmlBody) body.htmlbody = opts.htmlBody;
  if (opts.textBody) body.textbody = opts.textBody;

  try {
    const res = await fetch(ZEPTOMAIL_API, {
      method: "POST",
      headers: {
        Authorization: TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[email] ZeptoMail API error ${res.status}: ${errText}`);
      return false;
    }

    const data = await res.json() as { message_id?: string };
    console.log(`[email] Sent "${opts.subject}" — messageId: ${data.message_id || "unknown"}`);
    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

// ─── Template builders (return SendEmailOptions without the `to` field) ────

type TemplateOptions = Omit<SendEmailOptions, "to">;

export const EmailTemplates = {
  welcome(name: string): TemplateOptions {
    return {
      subject: "Welcome to GKAC – Application Received",
      htmlBody: `<p>Dear ${name},</p>
<p>Thank you for applying to join the <strong>Guild of Kwande and Allied Crafts (GKAC)</strong>. Your application has been received and is being processed.</p>
<p>Please proceed with your membership payment. Once your payment is verified, your application will be reviewed for approval.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

Thank you for applying to join the Guild of Kwande and Allied Crafts (GKAC). Your application has been received and is being processed.

Please proceed with your membership payment. Once your payment is verified, your application will be reviewed for approval.

Best regards,
GKAC Secretariat`,
    };
  },

  approved(name: string, membershipCode: string): TemplateOptions {
    return {
      subject: "Congratulations! Your GKAC Membership is Approved",
      htmlBody: `<p>Dear ${name},</p>
<p>Congratulations! Your membership application to the <strong>Guild of Kwande and Allied Crafts (GKAC)</strong> has been approved.</p>
<p>Your membership number is: <strong>${membershipCode}</strong></p>
<p>Welcome to the guild! You can now log in to access member resources, events, and more.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

Congratulations! Your membership application to the Guild of Kwande and Allied Crafts (GKAC) has been approved.

Your membership number is: ${membershipCode}

Welcome to the guild! You can now log in to access member resources, events, and more.

Best regards,
GKAC Secretariat`,
    };
  },

  rejected(name: string, reason: string): TemplateOptions {
    return {
      subject: "Update on Your GKAC Membership Application",
      htmlBody: `<p>Dear ${name},</p>
<p>After careful review, we regret to inform you that your membership application to the <strong>Guild of Kwande and Allied Crafts (GKAC)</strong> has not been approved at this time.</p>
<p><strong>Reason:</strong> ${reason}</p>
<p>If you believe this decision was made in error, please contact us.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

After careful review, we regret to inform you that your membership application to the Guild of Kwande and Allied Crafts (GKAC) has not been approved at this time.

Reason: ${reason}

If you believe this decision was made in error, please contact us.

Best regards,
GKAC Secretariat`,
    };
  },

  passwordReset(name: string, resetLink: string): TemplateOptions {
    return {
      subject: "Reset Your GKAC Password",
      htmlBody: `<p>Dear ${name},</p>
<p>We received a request to reset your password for your GKAC account. Click the link below to reset it:</p>
<p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#1a5632;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
<p>Or copy and paste this link: ${resetLink}</p>
<p>This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

We received a request to reset your password for your GKAC account.

Copy and paste the link below to reset your password:
${resetLink}

This link expires in 1 hour. If you did not request a password reset, please ignore this email.

Best regards,
GKAC Secretariat`,
    };
  },

  renewalReminder(name: string, membershipCode: string, expiryDate: string): TemplateOptions {
    return {
      subject: "Your GKAC Membership is Due for Renewal",
      htmlBody: `<p>Dear ${name},</p>
<p>Your GKAC membership (<strong>${membershipCode}</strong>) is due for renewal. Your membership expires on <strong>${expiryDate}</strong>.</p>
<p>Please log in to renew your membership and continue enjoying the benefits of the guild.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

Your GKAC membership (${membershipCode}) is due for renewal. Your membership expires on ${expiryDate}.

Please log in to renew your membership and continue enjoying the benefits of the guild.

Best regards,
GKAC Secretariat`,
    };
  },

  paymentReceived(name: string, reference: string): TemplateOptions {
    return {
      subject: "Payment Proof Received – GKAC",
      htmlBody: `<p>Dear ${name},</p>
<p>We have received your proof of payment (reference: <strong>${reference}</strong>).</p>
<p>Your application is now pending admin review. You will be notified once it has been processed.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

We have received your proof of payment (reference: ${reference}).

Your application is now pending admin review. You will be notified once it has been processed.

Best regards,
GKAC Secretariat`,
    };
  },

  suspended(name: string): TemplateOptions {
    return {
      subject: "Your GKAC Membership Has Been Suspended",
      htmlBody: `<p>Dear ${name},</p>
<p>Your GKAC membership has been suspended. Please contact the secretariat for more information.</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

Your GKAC membership has been suspended. Please contact the secretariat for more information.

Best regards,
GKAC Secretariat`,
    };
  },

  reinstated(name: string): TemplateOptions {
    return {
      subject: "Your GKAC Membership Has Been Reinstated",
      htmlBody: `<p>Dear ${name},</p>
<p>Your GKAC membership has been reinstated. Welcome back!</p>
<p>Best regards,<br/>GKAC Secretariat</p>`,
      textBody: `Dear ${name},

Your GKAC membership has been reinstated. Welcome back!

Best regards,
GKAC Secretariat`,
    };
  },

  contactNotification(contactName: string, contactEmail: string, contactSubject: string, contactMessage: string): TemplateOptions {
    return {
      subject: `New Contact Message: ${contactSubject}`,
      htmlBody: `<p>A new message was submitted via the GKAC contact form:</p>
<p><strong>Name:</strong> ${contactName}<br/>
<strong>Email:</strong> ${contactEmail}<br/>
<strong>Subject:</strong> ${contactSubject}</p>
<p>${contactMessage}</p>`,
      textBody: `New contact form message:

Name: ${contactName}
Email: ${contactEmail}
Subject: ${contactSubject}

${contactMessage}`,
    };
  },
};

/**
 * Helper: build and send a templated email to a recipient in one call.
 */
export async function sendTemplatedEmail(
  to: EmailRecipient,
  template: TemplateOptions,
): Promise<boolean> {
  return sendEmail({ ...template, to });
}

export default sendEmail;
