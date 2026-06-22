"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type DuesMember } from "@/lib/api";

const FEE_STRUCTURE = [
  { fee: "Membership Fee", amount: "₦10,000", frequency: "One-time", description: "Payable upon registration to become a member" },
  { fee: "Annual Developmental Fee", amount: "₦50,000", frequency: "Yearly", description: "Required for voting eligibility and full membership privileges" },
  { fee: "Annual Due", amount: "₦24,000", frequency: "Yearly", description: "Annual membership subscription for the calendar year" },
];

const BENEFITS = [
  "GKAC certification and designation",
  "Access to global conferences and chapter events",
  "Leadership Development Programmes",
  "Digital membership card with worldwide verification",
  "Listing in the Global GKAC Directory",
  "Access to the member resource library",
  "Voting rights in Club elections (with paid Annual Developmental Fee)",
  "Networking opportunities with industry leaders",
];

const STEPS = [
  { title: "Create Account", desc: "Register online with your email and personal details." },
  { title: "Pay Membership Fee", desc: "Make a one-time payment of ₦10,000 to activate your membership." },
  { title: "Application Review", desc: "Our membership committee reviews your application within 10 working days." },
  { title: "Pay Annual Dues", desc: "Pay your Annual Developmental Fee (₦50,000) and Annual Due (₦24,000) to maintain active status." },
];

export default function MembershipPage() {
  useEffect(() => {
    document.title = "Membership — GKAC";
  }, []);

  // ─── Dues Directory State ─────────────────────────────────────────────
  const [duesMembers, setDuesMembers] = useState<DuesMember[]>([]);
  const [duesLoading, setDuesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "due" | "devFee">("all");

  useEffect(() => {
    api.getDuesDirectory().then((res) => {
      if (res.data) setDuesMembers(res.data.members);
      setDuesLoading(false);
    });
  }, []);

  const filtered = duesMembers.filter((m) => {
    const matchesSearch =
      !search ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (m.membershipCode || "").toLowerCase().includes(search.toLowerCase());

    if (filter === "due") return matchesSearch && m.annualDuePaid;
    if (filter === "devFee") return matchesSearch && m.annualDevelopmentalFeePaid;
    return matchesSearch;
  });

  const duePaidCount = duesMembers.filter((m) => m.annualDuePaid).length;
  const devFeePaidCount = duesMembers.filter((m) => m.annualDevelopmentalFeePaid).length;

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Membership Information</h2>
          <p>Join the Global Kegite Archaverians Club and become part of a distinguished international brotherhood.</p>
        </div>

        {/* Fee Structure Table */}
        <h3 style={{ marginTop: "var(--space-5)", textAlign: "center" }}>Fee Structure</h3>
        <div style={{ overflowX: "auto", marginTop: "var(--space-3)" }}>
          <table className="fee-table">
            <thead>
              <tr><th>Fee Type</th><th>Amount</th><th>Frequency</th><th>Description</th></tr>
            </thead>
            <tbody>
              {FEE_STRUCTURE.map((f) => (
                <tr key={f.fee}>
                  <td><strong>{f.fee}</strong></td>
                  <td>{f.amount}</td>
                  <td>{f.frequency}</td>
                  <td>{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Election Eligibility Note */}
        <div className="card" style={{ marginTop: "var(--space-3)", background: "var(--green-light)", border: "1px solid var(--green)" }}>
          <p style={{ margin: 0, fontSize: "16px" }}>
            <strong>🗳️ Voting Eligibility:</strong> Only members who have paid the <strong>Annual Developmental Fee (₦50,000)</strong> for the current year are eligible to vote in GKAC elections.
          </p>
        </div>

        {/* Benefits */}
        <h3 style={{ marginTop: "var(--space-5)" }}>Member Benefits</h3>
        <ul className="benefit-list" style={{ marginTop: "var(--space-2)" }}>
          {BENEFITS.map((b) => (
            <li key={b}><span className="check">✓</span> {b}</li>
          ))}
        </ul>

        {/* How to Join */}
        <h3 style={{ marginTop: "var(--space-5)", textAlign: "center" }}>How to Join</h3>
        <div className="steps" style={{ marginTop: "var(--space-3)" }}>
          {STEPS.map((s) => (
            <div key={s.title} className="step-card">
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Online & Offline Options */}
        <div style={{ marginTop: "var(--space-5)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--space-3)" }}>
          <div className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
            <div className="card-icon">🌐</div>
            <h3 style={{ marginBottom: "var(--space-1)" }}>Apply Online</h3>
            <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "var(--space-2)" }}>
              Complete your membership registration online. Fill out the form, upload your documents, and pay securely.
            </p>
            <Link href="/register" className="btn btn-accent btn-lg" style={{ fontSize: "16px", padding: "14px 32px" }}>
              Apply Online &rarr;
            </Link>
          </div>
          <div className="card" style={{ padding: "var(--space-4)", textAlign: "center" }}>
            <div className="card-icon">📄</div>
            <h3 style={{ marginBottom: "var(--space-1)" }}>Offline / Printable Form</h3>
            <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "var(--space-2)" }}>
              Download and print the membership application form. Submit the completed form with your payment proof to the Secretariat.
            </p>
            <a href="/gkac-membership-form.pdf" download className="btn btn-outline btn-lg" style={{ fontSize: "16px", padding: "14px 32px" }}>
              Download Form &darr;
            </a>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <Link href="/register" className="btn btn-accent btn-lg">
            Start Your Application
          </Link>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* DUES DIRECTORY                                                 */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div id="dues-directory" style={{ marginTop: "var(--space-6)", borderTop: "2px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <div className="section-header">
            <div className="section-divider" />
            <h2>Dues Directory</h2>
            <p style={{ fontSize: "19px" }}>
              Directory of members who have paid their annual dues and developmental fees.
            </p>
          </div>

          {/* Summary Cards */}
          <div className="stats-bar" style={{ marginBottom: "var(--space-4)" }}>
            <div className="stat-card-premium">
              <div className="sp-value">{duesMembers.length}</div>
              <div className="sp-label">Total Members</div>
            </div>
            <div className="stat-card-premium">
              <div className="sp-value">{duePaidCount}</div>
              <div className="sp-label">Annual Due Paid</div>
            </div>
            <div className="stat-card-premium">
              <div className="sp-value">{devFeePaidCount}</div>
              <div className="sp-label">Dev. Fee Paid</div>
            </div>
          </div>

          {/* Search & Filter */}
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginBottom: "var(--space-3)", maxWidth: 600 }}>
            <input
              type="text"
              placeholder="Search by name or membership code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "due" | "devFee")}>
              <option value="all">All Members</option>
              <option value="due">Annual Due Paid</option>
              <option value="devFee">Dev. Fee Paid</option>
            </select>
          </div>

          {/* Members Table */}
          {duesLoading ? (
            <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading directory…</p>
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center" }}>
              <p style={{ color: "var(--muted)" }}>No members found matching your criteria.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="fee-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Membership Code</th>
                    <th>Category</th>
                    <th>Annual Due</th>
                    <th>Dev. Fee</th>
                    <th>Dev. Levy Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m, idx) => (
                    <tr key={m.id}>
                      <td>{idx + 1}</td>
                      <td><strong>{m.firstName} {m.lastName}</strong></td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}>{m.membershipCode || "—"}</td>
                      <td>{m.membershipCategory || "—"}</td>
                      <td>
                        {m.annualDuePaid ? (
                          <span className="status-badge status-active">● Paid ({m.annualDueYear || "—"})</span>
                        ) : (
                          <span className="status-badge status-pending">○ Pending</span>
                        )}
                      </td>
                      <td>
                        {m.annualDevelopmentalFeePaid ? (
                          <span className="status-badge status-active">● Paid ({m.annualDevelopmentalFeeYear || "—"})</span>
                        ) : (
                          <span className="status-badge status-pending">○ Pending</span>
                        )}
                      </td>
                      <td>
                        {m.developmentalLevyAmount
                          ? `₦${(m.developmentalLevyAmount / 100).toLocaleString()}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
