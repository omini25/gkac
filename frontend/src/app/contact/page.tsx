"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const CONTACT_DETAILS = [
  { icon: "📍", title: "Headquarters", lines: ["Global Kegite Archaverians Club", "Unity House, Main Boulevard", "Lagos, Nigeria"] },
  { icon: "📞", title: "Phone", lines: ["+234 800 000 0000", "+234 800 000 0001"] },
  { icon: "✉️", title: "Email", lines: ["info@gkacglobal.org", "membership@gkacglobal.org"] },
  { icon: "🕐", title: "Office Hours", lines: ["Monday – Friday", "8:00 AM – 5:00 PM (WAT)", "Closed on public holidays"] },
];

type Errors = { name?: string; email?: string; subject?: string; message?: string };

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") as string || "").trim();
    const email = (data.get("email") as string || "").trim();
    const subject = (data.get("subject") as string) || "";
    const message = (data.get("message") as string || "").trim();

    const errs: Errors = {};
    if (!name) errs.name = "Please enter your full name.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address.";
    if (!subject) errs.subject = "Please select a subject.";
    if (!message || message.length < 10) errs.message = "Please enter your message (minimum 10 characters).";

    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSending(true);
      const res = await api.submitContact({ name, email, subject, message });
      setSending(false);
      if (res.data) {
        setSubmitted(true);
        form.reset();
        setTimeout(() => setSubmitted(false), 6000);
      }
    }
  }

  function clearError(field: keyof Errors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Contact Us</h2>
          <p>We&apos;re here to help. Reach out with any questions about membership, events, or GKAC.</p>
        </div>
        <div className="contact-layout">
          {/* Form */}
          <div>
            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="contactName">Full Name *</label>
                <input type="text" id="contactName" name="name" required placeholder="Your full name" onChange={() => clearError("name")} />
                <span className={`form-error${errors.name ? " visible" : ""}`}>{errors.name}</span>
              </div>
              <div className="form-group">
                <label htmlFor="contactEmail">Email Address *</label>
                <input type="email" id="contactEmail" name="email" required placeholder="your.email@example.com" onChange={() => clearError("email")} />
                <span className={`form-error${errors.email ? " visible" : ""}`}>{errors.email}</span>
              </div>
              <div className="form-group">
                <label htmlFor="contactSubject">Subject *</label>
                <select id="contactSubject" name="subject" required defaultValue="" onChange={() => clearError("subject")}>
                  <option value="" disabled>Select a topic…</option>
                  <option>Membership Enquiry</option>
                  <option>Event Information</option>
                  <option>Verification Help</option>
                  <option>Media / Press</option>
                  <option>General Enquiry</option>
                  <option>Complaint</option>
                </select>
                <span className={`form-error${errors.subject ? " visible" : ""}`}>{errors.subject}</span>
              </div>
              <div className="form-group">
                <label htmlFor="contactMessage">Message *</label>
                <textarea id="contactMessage" name="message" required placeholder="Tell us how we can help…" onChange={() => clearError("message")} />
                <span className={`form-error${errors.message ? " visible" : ""}`}>{errors.message}</span>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={sending}>
                {sending ? "Sending…" : "Send Message"}
              </button>
              <div className={`form-success${submitted ? " visible" : ""}`}>
                ✓ Your message has been sent. We&apos;ll respond within 2 working days.
              </div>
            </form>
          </div>
          {/* Details */}
          <div className="contact-details">
            {CONTACT_DETAILS.map((d) => (
              <div key={d.title} className="contact-detail-item">
                <div className="cd-icon">{d.icon}</div>
                <div>
                  <h4>{d.title}</h4>
                  {d.lines.map((line, i) => (
                    <p key={i} style={{ marginBottom: 0 }}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
