"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

const POSITIONS = [
  "President",
  "Vice President",
  "General Secretary",
  "Assistant Secretary",
  "Treasurer",
  "Financial Secretary",
  "Public Relations Officer (PRO)",
  "Welfare Officer",
  "Auditor",
];

export default function ExpressionOfInterestPage() {
  const { user } = useAuth();
  const formRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    membershipCode: "",
    phone: "",
    email: "",
    position: "",
    manifesto: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  // Auto-fill from user if logged in
  if (user && !formData.fullName) {
    setFormData((prev) => ({
      ...prev,
      fullName: `${user.firstName} ${user.lastName}`,
      membershipCode: user.membershipCode || "",
      email: user.email || "",
      phone: user.phone || "",
    }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.fullName || !formData.membershipCode || !formData.phone || !formData.email || !formData.position) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("gkac_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const res = await fetch(`${API_BASE}/elections/nominate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          formType: "expression",
          position: formData.position,
          statement: formData.manifesto.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Submission failed.", "error");
      } else {
        showToast("Expression of Interest submitted successfully!", "success");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    }
    setSubmitting(false);
  }

  function handleDownloadPdf() {
    window.print();
  }

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="section-header">
          <div className="section-divider" />
          <h2>🗳️ Expression of Interest</h2>
          <p>
            2026/2028 GKAC Global Headquarters Elections — Submit your expression of interest
            for any available position.
          </p>
        </div>

        {/* Fee Info */}
        <div className="card" style={{
          marginBottom: "var(--space-4)", background: "var(--green-light)",
          border: "1px solid var(--green)", textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: "15px" }}>
            <strong>Expression of Interest Fee:</strong> ₦20,000 — Pay to <strong>Opay: 703 5330 954</strong> (Oluyemi Akintayo)
          </p>
        </div>

        {/* ================================================================ */}
        {/* PRINTABLE / PDF FORM                                             */}
        {/* ================================================================ */}
        <div ref={formRef} className="eoi-form-print">
          {/* Header */}
          <div className="eoi-header">
            <h1>GLOBAL KEGITE ARCHAVERIANS CLUB</h1>
            <h2>EXPRESSION OF INTEREST FORM</h2>
            <p>2026/2028 Global Headquarters Election</p>
          </div>

          <div className="eoi-body">
            <div className="form-row">
              <div className="form-field">
                <label>Full Name *</label>
                <input
                  type="text" name="fullName" value={formData.fullName}
                  onChange={handleChange} placeholder="Surname, First name, Middle name"
                  required
                />
              </div>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <div className="form-field">
                <label>Membership Code *</label>
                <input
                  type="text" name="membershipCode" value={formData.membershipCode}
                  onChange={handleChange} placeholder="e.g. MEM-2025-XXXXX"
                  required
                />
              </div>
              <div className="form-field">
                <label>Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <div className="form-field">
                <label>Phone Number *</label>
                <input
                  type="tel" name="phone" value={formData.phone}
                  onChange={handleChange} placeholder="+234 8XX XXX XXXX"
                  required
                />
              </div>
              <div className="form-field">
                <label>Email Address *</label>
                <input
                  type="email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Position Interested In *</label>
              <select name="position" value={formData.position} onChange={handleChange} required>
                <option value="">— Select Position —</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p.toLowerCase().replace(/\s+/g, "-")}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Personal Statement / Manifesto</label>
              <textarea
                name="manifesto" value={formData.manifesto}
                onChange={handleChange}
                placeholder="Briefly state why you are interested in this position and what you intend to do if elected…"
                rows={4}
              />
            </div>

            {/* Declaration */}
            <div className="eoi-declaration">
              <h4>Declaration</h4>
              <p>
                I, <strong>{formData.fullName || "______________________"}</strong>, hereby express my interest
                to contest for the position of <strong>{formData.position ? POSITIONS.find((p) => p.toLowerCase().replace(/\s+/g, "-") === formData.position) || formData.position : "______________________"}</strong>
                &nbsp;in the 2026/2028 GKAC Global Headquarters Election.
              </p>
              <p>
                I affirm that the information provided above is true and correct. I have read and accepted
                the terms and conditions of the election process as stipulated by the Electoral Committee.
              </p>
              <div className="signature-row">
                <div className="signature-field">
                  <label>Signature</label>
                  <div className="sig-line">_________________________</div>
                </div>
                <div className="signature-field">
                  <label>Date</label>
                  <div className="sig-line">{formData.date || "_________________________"}</div>
                </div>
              </div>
            </div>

            {/* For Official Use */}
            <div className="eoi-official">
              <h4>For Official Use Only</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                <div>
                  <p><strong>Received by:</strong> _________________________</p>
                  <p><strong>Date Received:</strong> _________________________</p>
                </div>
                <div>
                  <p><strong>Payment Verified:</strong> ◻ Yes &nbsp;&nbsp; ◻ No</p>
                  <p><strong>Approved:</strong> ◻ Yes &nbsp;&nbsp; ◻ No</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* ACTIONS (hidden when printing)                                   */}
        {/* ================================================================ */}
        <div className="no-print" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
          <button className="btn btn-accent btn-lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Expression of Interest"}
          </button>
          <button className="btn btn-outline btn-lg" onClick={handleDownloadPdf}>
            ⬇ Download PDF
          </button>
          <Link href="/elections" className="btn btn-ghost btn-lg">
            ← Back to Elections
          </Link>
        </div>

        {toast && (
          <div
            className={`form-${toast.type === "success" ? "success" : "error"} visible no-print`}
            style={{ marginTop: "var(--space-2)" }}
          >
            {toast.type === "success" ? "✓ " : ""}{toast.msg}
          </div>
        )}

        {/* Print Help */}
        <p className="no-print" style={{ marginTop: "var(--space-2)", color: "var(--muted)", fontSize: "13px", textAlign: "center" }}>
          💡 Click <strong>Download PDF</strong> to open your browser&apos;s print dialog — choose <strong>&quot;Save as PDF&quot;</strong> as the destination.
        </p>
      </div>
    </div>
  );
}
