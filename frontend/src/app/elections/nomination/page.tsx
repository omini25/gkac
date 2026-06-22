"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";
import Link from "next/link";

export default function NominationPage() {
  const { user } = useAuth();
  const [formType, setFormType] = useState<"expression" | "nomination">("expression");
  const [position, setPosition] = useState("");
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      showToast("You must be signed in to submit.", "error");
      return;
    }
    if (!position) {
      showToast("Please select a position.", "error");
      return;
    }

    setSubmitting(true);

    const payload: Record<string, unknown> = {
      formType,
      position,
      statement: statement.trim() || null,
    };

    const res = await request("/elections/nominate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (res.error) {
      showToast(res.error, "error");
      return;
    }

    showToast(
      formType === "expression"
        ? "Expression of Interest submitted successfully!"
        : "Nomination form submitted successfully!",
      "success"
    );
    setPosition("");
    setStatement("");
  }

  if (!user) {
    return (
      <div className="page-section">
        <div className="container" style={{ textAlign: "center" }}>
          <h2>Nomination &amp; Expression of Interest</h2>
          <p style={{ marginBottom: "var(--space-3)" }}>
            You must be signed in as a member to access this form.
          </p>
          <Link href="/login" className="btn btn-accent btn-lg">
            Sign In to Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="section-header">
          <div className="section-divider" />
          <h2>Election 2026/2028 — Nomination &amp; Expression of Interest</h2>
          <p style={{ fontSize: "16px" }}>
            Complete the form below to express interest or submit your nomination
            for a position in the Global Headquarters Executive Election.
          </p>
        </div>

        {/* Fee Summary */}
        <div className="card" style={{
          marginBottom: "var(--space-4)", background: "var(--green-light)",
          border: "1px solid var(--green)",
        }}>
          <h4 style={{ marginBottom: "var(--space-1)" }}>Fee Schedule</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>Expression of Interest</p>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent)", margin: 0 }}>₦20,000</p>
            </div>
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>Nomination Form</p>
              <p style={{ fontSize: "16px", margin: 0 }}>
                President: <strong style={{ color: "var(--accent)" }}>₦100,000</strong>
              </p>
              <p style={{ fontSize: "16px", margin: 0 }}>
                Other Positions: <strong style={{ color: "var(--accent)" }}>₦50,000</strong>
              </p>
            </div>
          </div>
          <div style={{ marginTop: "var(--space-2)", padding: "var(--space-1)", background: "#fff", borderRadius: "var(--radius-sm)" }}>
            <p style={{ margin: 0, fontSize: "14px" }}>
              <strong>Payment:</strong> Opay — 703 5330 954 (Oluyemi Akintayo)
            </p>
          </div>
        </div>

        {/* Form Type Toggle */}
        <div className="tabs" style={{ marginBottom: "var(--space-3)", justifyContent: "center" }}>
          <button
            className={`tab-btn${formType === "expression" ? " active" : ""}`}
            onClick={() => setFormType("expression")}
          >
            📝 Expression of Interest
          </button>
          <button
            className={`tab-btn${formType === "nomination" ? " active" : ""}`}
            onClick={() => setFormType("nomination")}
          >
            📋 Nomination Form
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="memberName">Member Name</label>
            <input
              type="text" id="memberName"
              value={`${user.firstName} ${user.lastName}`}
              disabled
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="memberCode">Membership Code</label>
            <input
              type="text" id="memberCode"
              value={user.membershipCode || "—"}
              disabled
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="position">Position *</label>
            <select
              id="position" value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            >
              <option value="">Select a position…</option>
              <option value="president">President</option>
              <option value="vice-president">Vice President</option>
              <option value="general-secretary">General Secretary</option>
              <option value="assistant-secretary">Assistant Secretary</option>
              <option value="treasurer">Treasurer</option>
              <option value="financial-secretary">Financial Secretary</option>
              <option value="public-relations-officer">Public Relations Officer (PRO)</option>
              <option value="welfare-officer">Welfare Officer</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="statement">Personal Statement / Manifesto</label>
            <textarea
              id="statement" value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="Tell members why you are the right candidate for this position…"
              rows={5}
            />
          </div>

          {toast && (
            <div
              className={`form-${toast.type === "success" ? "success" : "error"} visible`}
              style={{ marginBottom: "var(--space-2)" }}
            >
              {toast.type === "success" ? "✓ " : ""}{toast.msg}
            </div>
          )}

          <button type="submit" className="btn btn-accent btn-lg" style={{ width: "100%" }} disabled={submitting}>
            {submitting
              ? "Submitting…"
              : formType === "expression"
                ? "Submit Expression of Interest"
                : "Submit Nomination Form"}
          </button>
        </form>

        {/* Important Notice */}
        <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>
            <strong>Note:</strong> Payment of allotted fees validates eligibility to be voted for.
            Please ensure you have made payment to the Opay account above.
          </p>
          <Link href="/elections/calendar" style={{ fontSize: "14px" }}>
            View Full Election Calendar &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper for authenticated requests
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data?: T; error?: string }> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("gkac_token") : null;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error || `Request failed (${res.status})` };
    return { data: json as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}
