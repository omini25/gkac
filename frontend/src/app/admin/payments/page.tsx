"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface PaymentItem {
  id: string;
  amountKobo: number;
  reference: string;
  status: string;
  paymentType: string;
  proofUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  member: {
    id: string;
    name: string;
    email: string;
    membershipCode: string;
    category: string;
  };
}

interface RenewalDue {
  id: string;
  name: string;
  email: string;
  membershipCode: string;
  category: string;
  expiresAt: string;
  expectedAmount: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [renewals, setRenewals] = useState<RenewalDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Review modal
  const [reviewPayment, setReviewPayment] = useState<PaymentItem | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalCollected: 0, renewalsDue: 0, pendingTotal: 0, pendingCount: 0, collectionRate: 0,
  });

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [payRes, statsRes, renewRes] = await Promise.all([
      api.getAdminPayments(),
      api.getAdminPaymentStats(),
      api.getRenewalsDue(),
    ]);
    if (payRes.data) setPayments(payRes.data.payments);
    else if (payRes.error) showToast(payRes.error, "error");

    if (statsRes.data && statsRes.data.stats) {
      setStats(statsRes.data.stats);
    } else {
      showToast(statsRes.error || "Could not load payment stats.", "error");
    }

    if (renewRes.data) setRenewals(renewRes.data.members);
    else if (renewRes.error) console.warn("Renewals error:", renewRes.error);

    setLoading(false);
  }

  async function handleConfirm(p: PaymentItem) {
    setReviewing(true);
    const res = await api.confirmPayment(p.id);
    setReviewing(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Payment confirmed.", "success");
      setReviewPayment(null);
      loadAll();
    }
  }

  async function handleReject(p: PaymentItem) {
    setReviewing(true);
    const res = await api.rejectPayment(p.id);
    setReviewing(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Payment rejected.", "success");
      setReviewPayment(null);
      loadAll();
    }
  }

  async function handleRemind(r: RenewalDue) {
    const res = await api.remindMember(r.id);
    if (res.error) showToast(res.error, "error");
    else showToast(`Reminder sent to ${r.name}.`, "success");
  }

  const filtered = payments.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      p.member.name.toLowerCase().includes(s) ||
      p.member.membershipCode.toLowerCase().includes(s) ||
      p.reference.toLowerCase().includes(s);
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchType = filterType === "all" || p.paymentType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  function exportCSV() {
    if (filtered.length === 0) { showToast("No payments to export.", "error"); return; }
    const headers = ["Member","Email","Membership No","Category","Amount","Type","Reference","Status","Date"];
    const rows = filtered.map((p) => [
      p.member.name, p.member.email, p.member.membershipCode, p.member.category,
      `₦${(p.amountKobo / 100).toLocaleString()}`, p.paymentType, p.reference,
      p.status, new Date(p.createdAt).toLocaleDateString("en-GB"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gkac-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} payment(s).`, "success");
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function fmtNaira(kobo: number) {
    const n = Number(kobo);
    if (isNaN(n) || n === 0) return "₦0";
    return `₦${(n / 100).toLocaleString()}`;
  }

  return (
    <>
      {/* Payment Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{fmtNaira(stats.totalCollected)}</div>
          <div className="stat-label">Total Collected (YTD)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warn)" }}>{stats.renewalsDue}</div>
          <div className="stat-label">Renewals Due in 30 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{fmtNaira(stats.pendingTotal)}</div>
          <div className="stat-label">Pending ({stats.pendingCount} payments)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.collectionRate}%</div>
          <div className="stat-label">Collection Rate</div>
        </div>
      </div>

      {/* Payment Records */}
      <div className="card">
        <div className="card-header">
          <h3>Payment Records</h3>
          <button className="btn btn-outline btn-sm" onClick={exportCSV}>
            Export CSV
          </button>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by member name, membership number, or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="registration">Registration</option>
            <option value="renewal">Renewal</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 24 }}><span className="loader-dot" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                  {payments.length === 0 ? "No payment records yet. Payments will appear here once members submit payment proofs." : "No payments match your filters."}
                </td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.member.name}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.member.membershipCode}</span>
                    </td>
                    <td>{fmtNaira(p.amountKobo)}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.paymentType}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{fmtDate(p.createdAt)}</td>
                    <td style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{p.reference}</td>
                    <td>
                      <span className={`badge ${p.status === "confirmed" ? "badge-active" : p.status === "pending" ? "badge-pending" : "badge-expired"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="actions">
                      {p.proofUrl && (
                        <button className="btn btn-ghost btn-xs" onClick={() => setReviewPayment(p)}
                          style={{ textDecoration: "none" }}>
                          {p.status === "pending" ? "🔍 Review" : "👁 View"}
                        </button>
                      )}
                      {p.status === "pending" && !p.proofUrl && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>No proof uploaded</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewals Due */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Renewals Due (Next 30 Days)</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          {renewals.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: "16px 0", textAlign: "center" }}>
              No members have membership expiring in the next 30 days.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Category</th>
                  <th>Expected Amount</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {renewals.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.membershipCode}</span>
                    </td>
                    <td>{r.category}</td>
                    <td>{fmtNaira(r.expectedAmount)}</td>
                    <td style={{ color: "var(--warn)", fontWeight: 600 }}>{fmtDate(r.expiresAt)}</td>
                    <td>
                      <button className="btn btn-accent btn-xs" onClick={() => handleRemind(r)}>
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review / View Proof Modal */}
      {reviewPayment && (
        <div className="modal-overlay open" onClick={() => { if (!reviewing) setReviewPayment(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setReviewPayment(null)} disabled={reviewing}>✕</button>
            <h3 style={{ marginBottom: 16 }}>
              {reviewPayment.status === "pending" ? "Review Payment" : "Payment Details"}
            </h3>

            {/* Member Info */}
            <div style={{ marginBottom: 14, padding: 12, background: "var(--green-light)", borderRadius: 8, fontSize: 13 }}>
              <strong>{reviewPayment.member.name}</strong>
              <span style={{ color: "var(--muted)", marginLeft: 10 }}>{reviewPayment.member.membershipCode}</span>
              <br />
              <span style={{ color: "var(--muted)" }}>{reviewPayment.member.email} · {reviewPayment.member.category}</span>
            </div>

            {/* Payment Details */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 14 }}>
              <div><strong>Amount</strong><br /><span style={{ color: "var(--fg)" }}>{fmtNaira(reviewPayment.amountKobo)}</span></div>
              <div><strong>Type</strong><br /><span style={{ textTransform: "capitalize", color: "var(--fg)" }}>{reviewPayment.paymentType}</span></div>
              <div><strong>Date</strong><br /><span style={{ color: "var(--fg)" }}>{fmtDate(reviewPayment.createdAt)}</span></div>
              <div><strong>Reference</strong><br /><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg)" }}>{reviewPayment.reference}</span></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Status</strong><br />
                <span className={`badge ${reviewPayment.status === "confirmed" ? "badge-active" : reviewPayment.status === "pending" ? "badge-pending" : "badge-expired"}`}>
                  {reviewPayment.status}
                </span>
              </div>
            </div>

            {/* Receipt / Proof Image */}
            {reviewPayment.proofUrl && (
              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Uploaded Receipt</strong>
                <img
                  src={reviewPayment.proofUrl}
                  alt="Payment proof"
                  style={{
                    width: "100%", maxHeight: 340, objectFit: "contain",
                    borderRadius: 8, border: "1px solid var(--border)",
                    background: "#fafafa",
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <a
                  href={reviewPayment.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, display: "inline-block", marginTop: 4 }}
                >
                  Open in new tab ↗
                </a>
              </div>
            )}

            {/* Actions for pending payments */}
            {reviewPayment.status === "pending" && (
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  disabled={reviewing}
                  onClick={() => handleReject(reviewPayment)}
                >
                  {reviewing ? "Rejecting…" : "✕ Reject"}
                </button>
                <button
                  className="btn btn-accent"
                  style={{ flex: 1 }}
                  disabled={reviewing}
                  onClick={() => handleConfirm(reviewPayment)}
                >
                  {reviewing ? "Confirming…" : "✓ Confirm Payment"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
