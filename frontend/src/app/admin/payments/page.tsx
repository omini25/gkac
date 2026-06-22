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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stats {
  totalCollected: number;
  renewalsDue: number;
  pendingTotal: number;
  pendingCount: number;
  awaitingCount: number;
  totalConfirmed: number;
  lifetimeCollected: number;
  upcomingRenewals: number;
  collectionRate: number;
  totalRegistrations: number;
  totalRenewals: number;
  totalPaymentsThisYear: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [renewals, setRenewals] = useState<RenewalDue[]>([]);
  const [upcoming, setUpcoming] = useState<RenewalDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Pagination
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [pageInput, setPageInput] = useState("1");

  // Review modal
  const [reviewPayment, setReviewPayment] = useState<PaymentItem | null>(null);
  const [reviewing, setReviewing] = useState(false);

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalCollected: 0, renewalsDue: 0, pendingTotal: 0, pendingCount: 0,
    awaitingCount: 0, totalConfirmed: 0, lifetimeCollected: 0,
    upcomingRenewals: 0, collectionRate: 0, totalRegistrations: 0,
    totalRenewals: 0, totalPaymentsThisYear: 0,
  });

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll(page = 1) {
    setLoading(true);
    const [payRes, statsRes, renewRes, upRes] = await Promise.all([
      api.getAdminPayments(page, pagination.limit),
      api.getAdminPaymentStats(),
      api.getRenewalsDue(),
      api.getAdminUpcomingPayments(),
    ]);
    if (payRes.data) {
      setPayments(payRes.data.payments);
      if (payRes.data.pagination) setPagination(payRes.data.pagination);
    } else if (payRes.error) showToast(payRes.error, "error");

    if (statsRes.data && statsRes.data.stats) {
      setStats(statsRes.data.stats);
    } else {
      showToast(statsRes.error || "Could not load payment stats.", "error");
    }

    if (renewRes.data) setRenewals(renewRes.data.members);
    else if (renewRes.error) console.warn("Renewals error:", renewRes.error);

    if (upRes.data) setUpcoming(upRes.data.members);
    else if (upRes.error) console.warn("Upcoming error:", upRes.error);

    setLoading(false);
  }

  async function goToPage(p: number) {
    if (p < 1 || p > pagination.totalPages) return;
    setPageInput(String(p));
    await loadAll(p);
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
      await loadAll(pagination.page);
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
      await loadAll(pagination.page);
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

  function statusBadge(status: string) {
    const cls =
      status === "confirmed"
        ? "badge badge-active"
        : status === "awaiting_verification"
        ? "badge badge-pending"
        : status === "pending"
        ? "badge badge-pending"
        : status === "failed"
        ? "badge badge-expired"
        : "badge badge-pending";
    const label =
      status === "awaiting_verification" ? "Awaiting Review"
      : status === "confirmed" ? "Confirmed"
      : status === "pending" ? "Pending"
      : status === "failed" ? "Failed"
      : status;
    return <span className={cls}>{label}</span>;
  }

  return (
    <>
      {/* Payment Stats */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{fmtNaira(stats.lifetimeCollected)}</div>
          <div className="stat-label">Lifetime Collections</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            YTD: {fmtNaira(stats.totalCollected)} · {stats.totalConfirmed} payments
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{stats.totalRegistrations}</div>
          <div className="stat-label">New Registrations</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Renewals: {stats.totalRenewals}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.pendingCount > 0 ? "var(--warn)" : "var(--muted)" }}>
            {stats.pendingCount + stats.awaitingCount}
          </div>
          <div className="stat-label">Pending Verification</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {stats.awaitingCount} awaiting review · {stats.pendingCount} no proof
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.collectionRate}%</div>
          <div className="stat-label">Collection Rate (YTD)</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {fmtNaira(stats.pendingTotal)} pending value
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.renewalsDue > 0 ? "var(--danger)" : "var(--muted)" }}>
            {stats.renewalsDue}
          </div>
          <div className="stat-label">Due (30 days)</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            {stats.upcomingRenewals} upcoming (60 days)
          </div>
        </div>
      </div>

      {/* Payment Records */}
      <div className="card">
        <div className="card-header">
          <h3>Payment Records</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {pagination.total} total
            </span>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              Export CSV
            </button>
          </div>
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
            <option value="awaiting_verification">Awaiting Review</option>
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
                  {payments.length === 0 ? "No payment records yet." : "No payments match your filters."}
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
                    <td>{statusBadge(p.status)}</td>
                    <td className="actions">
                      {p.proofUrl || p.status === "awaiting_verification" ? (
                        <button className="btn btn-ghost btn-xs" onClick={() => setReviewPayment(p)}
                          style={{ textDecoration: "none" }}>
                          {(p.status === "pending" || p.status === "awaiting_verification") ? "🔍 Review" : "👁 View"}
                        </button>
                      ) : p.status === "pending" ? (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>No proof</span>
                      ) : (
                        <button className="btn btn-ghost btn-xs" onClick={() => setReviewPayment(p)}>
                          👁 View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 6, padding: "12px 0", fontSize: 13,
          }}>
            <button
              className="btn btn-outline btn-xs"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(1)}
              title="First page"
            >
              ««
            </button>
            <button
              className="btn btn-outline btn-xs"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              « Prev
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let pageNum: number;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`btn btn-xs ${pageNum === pagination.page ? "btn-accent" : "btn-outline"}`}
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="btn btn-outline btn-xs"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next »
            </button>
            <button
              className="btn btn-outline btn-xs"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.totalPages)}
              title="Last page"
            >
              »»
            </button>
            <span style={{ color: "var(--muted)", marginLeft: 8 }}>
              Page
              <input
                type="number"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const p = parseInt(pageInput, 10);
                    if (p >= 1 && p <= pagination.totalPages) goToPage(p);
                  }
                }}
                style={{
                  width: 50, margin: "0 4px", padding: "2px 6px",
                  textAlign: "center", border: "1px solid var(--border)",
                  borderRadius: 4, fontSize: 13,
                }}
              />
              of {pagination.totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Renewals Due (30 days) */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Renewals Due (Next 30 Days)</h3>
          {renewals.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
              {renewals.length} member{renewals.length !== 1 ? "s" : ""}
            </span>
          )}
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
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-accent btn-xs" onClick={() => handleRemind(r)}>
                          Send Reminder
                        </button>
                        <button className="btn btn-outline btn-xs" onClick={() => {
                          setSearch(r.membershipCode);
                        }}>
                          View Payments
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upcoming Renewals (31-60 days) */}
      {upcoming.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h3>Upcoming Renewals (31–60 Days)</h3>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
              {upcoming.length} member{upcoming.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
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
                {upcoming.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.membershipCode}</span>
                    </td>
                    <td>{r.category}</td>
                    <td>{fmtNaira(r.expectedAmount)}</td>
                    <td style={{ color: "var(--muted)", fontWeight: 600 }}>{fmtDate(r.expiresAt)}</td>
                    <td>
                      <button className="btn btn-accent btn-xs" onClick={() => handleRemind(r)}>
                        Send Reminder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review / View Proof Modal */}
      {reviewPayment && (
        <div className="modal-overlay open" onClick={() => { if (!reviewing) setReviewPayment(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setReviewPayment(null)} disabled={reviewing}>✕</button>
            <h3 style={{ marginBottom: 16 }}>
              {reviewPayment.status === "pending" || reviewPayment.status === "awaiting_verification"
                ? "Review Payment" : "Payment Details"}
            </h3>

            {/* Member Info */}
            <div style={{
              marginBottom: 14, padding: 12,
              background: reviewPayment.status === "confirmed" ? "var(--green-light)" : "var(--bg)",
              borderRadius: 8, fontSize: 13, border: "1px solid var(--border)",
            }}>
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
                {statusBadge(reviewPayment.status)}
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

            {/* Actions for unconfirmed payments */}
            {(reviewPayment.status === "pending" || reviewPayment.status === "awaiting_verification") && (
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

            {reviewPayment.status === "confirmed" && (
              <div style={{ textAlign: "center", padding: 8, background: "var(--green-light)", borderRadius: 8, fontSize: 13, color: "var(--success)" }}>
                ✅ Payment confirmed on {reviewPayment.paidAt ? fmtDate(reviewPayment.paidAt) : fmtDate(reviewPayment.createdAt)}
              </div>
            )}

            {reviewPayment.status === "failed" && (
              <div style={{ textAlign: "center", padding: 8, background: "#fef2f2", borderRadius: 8, fontSize: 13, color: "var(--danger)" }}>
                ❌ Payment was rejected
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
