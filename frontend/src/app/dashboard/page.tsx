"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth, getExpiryInfo } from "@/lib/useAuth";
import { api, type NewsItem, type EventItem, type Election, type PaymentRecord, type RenewMembershipResult } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(0);
  const [hrs, setHrs] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Renewal state ─────────────────────────────────────────────────────
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewStep, setRenewStep] = useState<"init" | "details" | "upload" | "done">("init");
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewError, setRenewError] = useState("");
  const [renewResult, setRenewResult] = useState<RenewMembershipResult | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [renewAmount, setRenewAmount] = useState("");

  const expiry = user ? getExpiryInfo(user.membershipExpiresAt) : { days: 0, expired: false };

  useEffect(() => {
    if (!user?.membershipExpiresAt) return;
    const expiresAt = user.membershipExpiresAt;
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setDays(0); setHrs(0); return; }
      setDays(Math.floor(diff / (1000 * 60 * 60 * 24)));
      setHrs(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [user?.membershipExpiresAt]);

  useEffect(() => {
    async function load() {
      const [newsRes, eventsRes, electionEventsRes, electionsRes, paymentsRes] = await Promise.all([
        api.getContent<NewsItem>("news"),
        api.getContent<EventItem>("events"),
        api.getElectionEvents(),
        api.getElections(),
        api.getPaymentHistory(),
      ]);
      if (newsRes.data) setNews(newsRes.data.items.slice(0, 3));
      const allEvents = [
        ...(eventsRes.data?.items || []),
        ...(electionEventsRes.data?.events || []),
      ];
      const upcoming = allEvents
        .filter((e: any) => new Date(e.event_date) >= new Date())
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 3);
      setEvents(upcoming);
      if (electionsRes.data) setElections(electionsRes.data.elections);
      if (paymentsRes.data) setPayments(paymentsRes.data.payments);
      setLoading(false);
    }
    load();
  }, []);

  const activeElections = elections.filter((e) => e.status === "active");
  const upcomingEvents = events;

  const statusBadge = () => {
    if (!user) return null;
    if (expiry.expired) return <span className="status-badge status-expired">● Expired</span>;
    if (user.applicationStatus === "pending_approval") return <span className="status-badge status-pending">● Pending Approval</span>;
    if (user.applicationStatus === "pending_payment") return <span className="status-badge status-pending">● Pending Payment</span>;
    if (user.applicationStatus === "rejected") return <span className="status-badge status-expired">● Rejected</span>;
    return <span className="status-badge status-active">● Active</span>;
  };

  const formattedCategory = user?.membershipCategory || "Member";
  const membershipNum = user?.membershipCode || "—";

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  // ─── Renewal handlers ──────────────────────────────────────────────────
  function openRenewModal() {
    setRenewStep("init");
    setRenewError("");
    setRenewResult(null);
    setProofFile(null);
    setRenewAmount("");
    setShowRenewModal(true);
  }

  async function handleRenewInit() {
    setRenewError("");
    const amountNaira = parseInt(renewAmount, 10);
    if (!amountNaira || amountNaira < 500) {
      setRenewError("Please enter a valid amount (minimum ₦500).");
      return;
    }
    if (!user) return;
    setRenewLoading(true);
    const res = await api.renewMembership(amountNaira * 100, user.email);
    setRenewLoading(false);
    if (res.error) { setRenewError(res.error); return; }
    if (res.data) {
      setRenewResult(res.data);
      setRenewStep("details");
    }
  }

  async function handleProofUpload() {
    if (!proofFile || !renewResult || !user) return;
    setUploading(true);
    setRenewError("");
    const res = await api.uploadPaymentProof(user.id, renewResult.paymentId, proofFile);
    setUploading(false);
    if (res.error) { setRenewError(res.error); return; }
    setRenewStep("done");
  }

  // ─── Fee status helpers ───────────────────────────────────────────────
  /** Payment types that count toward annual fee coverage (renewal covers all) */
  const ANNUAL_FEE_TYPES = ["renewal", "annual_due", "annual_developmental_fee"];

  function hasConfirmedPayment(types: string[]): boolean {
    return payments.some((p) => types.includes(p.payment_type) && p.status === "confirmed");
  }

  function getLastPaymentAmong(types: string[]): PaymentRecord | undefined {
    return payments
      .filter((p) => types.includes(p.payment_type) && p.status === "confirmed")
      .sort(
        (a, b) =>
          new Date(b.paid_at || b.created_at).getTime() -
          new Date(a.paid_at || a.created_at).getTime()
      )[0];
  }

  function feeStatus(type: string, userField: boolean | undefined): { label: string; className: string } {
    // For annual fees, also consider "renewal" payments as covering the fee
    const checkTypes = type === "annual_due" || type === "annual_developmental_fee"
      ? ANNUAL_FEE_TYPES
      : [type];

    if (userField === true || hasConfirmedPayment(checkTypes)) {
      return { label: "Paid ✓", className: "status-badge status-active" };
    }
    return { label: "Not Paid", className: "status-badge status-expired" };
  }

  function nextDue(feeType: string): string {
    if (feeType === "membership") return "N/A (One-time)";

    // For annual fees, calculate from the most recent relevant payment + 1 year
    const checkTypes = feeType === "annual_due" || feeType === "annual_developmental_fee"
      ? ANNUAL_FEE_TYPES
      : [feeType];

    const lastPayment = getLastPaymentAmong(checkTypes);
    if (lastPayment && lastPayment.paid_at) {
      const nextDate = new Date(lastPayment.paid_at);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      if (nextDate.getTime() > Date.now()) {
        return formatDate(nextDate.toISOString());
      }
      return "Overdue — Renew Now";
    }

    // Fall back to membership expiry if no payment history found
    if (!user?.membershipExpiresAt) return "—";
    const expires = new Date(user.membershipExpiresAt);
    if (expires.getTime() <= Date.now()) return "Overdue — Renew Now";
    return formatDate(user.membershipExpiresAt);
  }

  function formatNaira(kobo: number) {
    return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatPaymentDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {/* Status + Renewal Banner */}
      {/* <div
        className="card"
        style={{
          marginBottom: 20,
          borderLeft: `4px solid ${expiry.expired ? "var(--error)" : user?.applicationStatus === "approved" ? "var(--success)" : "var(--warn)"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            {statusBadge()}
            <span style={{ marginLeft: 12, fontSize: 14, color: "var(--muted)" }}>
              {formattedCategory} · {membershipNum}
            </span>
          </div>
          {user?.membershipExpiresAt && !expiry.expired && (
            <div className="countdown">
              <div className="countdown-block">
                <div className="cd-num">{days}</div>
                <div className="cd-label">Days</div>
              </div>
              <div className="countdown-block">
                <div className="cd-num">{hrs}</div>
                <div className="cd-label">Hours</div>
              </div>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>until renewal</span>
            </div>
          )}
          {(expiry.expired || (user?.membershipExpiresAt && !expiry.expired && days <= 30)) && (
            <button
              className="btn btn-sm"
              type="button"
              onClick={openRenewModal}
              style={{
                background: "var(--warn)",
                color: "#fff",
                border: "2px solid var(--warn)",
              }}
            >
              {expiry.expired ? "Renew Now" : "Renew Membership"}
            </button>
          )}
        </div>
      </div> */}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{loading ? "…" : activeElections.length}</div>
          <div className="stat-label">Active Elections</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{loading ? "…" : upcomingEvents.length}</div>
          <div className="stat-label">Upcoming Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user?.membershipCode ? membershipNum : "—"}</div>
          <div className="stat-label">Membership No.</div>
        </div>
        {/* <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>{formattedCategory}</div>
          <div className="stat-label">Category</div>
        </div> */}
      </div>

      {/* Fee Structure */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>💰 Fee Structure</h3>
          <Link href="/membership" style={{ fontSize: 13 }}>
            Full details →
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fee-table" style={{ margin: 0, width: "100%" }}>
            <thead>
              <tr><th>Fee Type</th><th>Amount</th><th>Frequency</th><th>Status</th><th>Next Due</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Membership Fee</strong></td>
                <td>₦10,000</td>
                <td>One-time</td>
                <td><span className={feeStatus("registration", user?.applicationStatus === "approved" ? true : undefined).className}>{feeStatus("registration", user?.applicationStatus === "approved" ? true : undefined).label}</span></td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{nextDue("membership")}</td>
              </tr>
              <tr>
                <td><strong>Annual Dues</strong></td>
                <td>₦24,000</td>
                <td>Yearly</td>
                <td><span className={feeStatus("annual_due", user?.annualDuePaid).className}>{feeStatus("annual_due", user?.annualDuePaid).label}</span></td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{nextDue("annual_due")}</td>
              </tr>
              <tr>
                <td><strong>Annual Developmental Fee</strong></td>
                <td>₦50,000</td>
                <td>Yearly</td>
                <td><span className={feeStatus("annual_developmental_fee", user?.annualDevelopmentalFeePaid).className}>{feeStatus("annual_developmental_fee", user?.annualDevelopmentalFeePaid).label}</span></td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{nextDue("annual_developmental_fee")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Two columns: Announcements + Events */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Announcements */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Announcements</h3>
            <Link href="/news" style={{ fontSize: 13 }}>
              View all →
            </Link>
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 16 }}><span className="loader-dot" /></p>
          ) : news.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No announcements yet.</p>
          ) : (
            news.map((item, i) => (
              <div
                key={item.id}
                style={{
                  paddingBottom: 12,
                  borderBottom: i < news.length - 1 ? "1px solid var(--border)" : "none",
                  marginBottom: i < news.length - 1 ? 12 : 0,
                }}
              >
                <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
                  {item.published_at ? formatDate(item.published_at) : formatDate(item.created_at)}
                </div>
                <div style={{ fontWeight: 600, margin: "2px 0" }}>{item.title}</div>
                <div style={{
                  fontSize: 13, color: "var(--muted)",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                } as React.CSSProperties}>
                  {item.body.replace(/<[^>]+>/g, "")}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="card-header">
            <h3>Upcoming Events</h3>
            <Link href="/dashboard/events" style={{ fontSize: 13 }}>
              View all →
            </Link>
          </div>
          {loading ? (
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 16 }}><span className="loader-dot" /></p>
          ) : upcomingEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No upcoming events.</p>
          ) : (
            upcomingEvents.map((ev, i) => {
              const d = new Date(ev.event_date);
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    paddingBottom: 12,
                    borderBottom: i < upcomingEvents.length - 1 ? "1px solid var(--border)" : "none",
                    marginBottom: i < upcomingEvents.length - 1 ? 12 : 0,
                  }}
                >
                  <div
                    style={{
                      minWidth: 44,
                      height: 44,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--green-dark)",
                      color: "#fff",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    {d.getDate()}
                    <span style={{ fontSize: 9 }}>
                      {d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <strong>{ev.title}</strong>
                    <br />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      {ev.location ? `${ev.location}${ev.event_time ? ` · ${ev.event_time}` : ""}` : ev.event_time ? ev.event_time : formatDate(ev.event_date)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Renewal Modal ──────────────────────────────────────────────── */}
      {showRenewModal && (
        <div className="modal-overlay open" onClick={() => setShowRenewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>Renew Membership</h3>
            <button className="modal-close" onClick={() => setShowRenewModal(false)}>✕</button>

            {renewStep === "init" && (
              <div>
                <p style={{ fontSize: 14, marginBottom: 16 }}>
                  Your membership{expiry.expired ? " has expired" : ` expires in ${days} days`}. Enter the renewal amount to proceed.
                </p>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Renewal Amount (₦)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 35000"
                  value={renewAmount}
                  onChange={(e) => setRenewAmount(e.target.value)}
                  min="500"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-strong)", fontSize: 16, marginBottom: 12,
                    background: "var(--surface)", color: "var(--fg)",
                  }}
                />
                {renewError && <p className="form-error visible" style={{ marginBottom: 12 }}>{renewError}</p>}
                <button
                  className="btn btn-accent"
                  onClick={handleRenewInit}
                  disabled={renewLoading}
                  style={{ width: "100%" }}
                >
                  {renewLoading ? "Initialising…" : "Proceed to Payment"}
                </button>
              </div>
            )}

            {renewStep === "details" && renewResult && (
              <div>
                <div className="card" style={{ background: "var(--green-light)", marginBottom: 16, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Payment Reference</p>
                  <p style={{ fontSize: 18, fontFamily: "var(--font-mono)", fontWeight: 700, margin: "4px 0 0" }}>
                    {renewResult.reference}
                  </p>
                </div>
                <p style={{ fontSize: 14, marginBottom: 12 }}>
                  Transfer the amount to the account below and use your <strong>Reference</strong> as the narration.
                </p>
                <table style={{ width: "100%", fontSize: 14, marginBottom: 16 }}>
                  <tbody>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Bank</td><td style={{ fontWeight: 600 }}>{renewResult.bankDetails.bankName}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Account Name</td><td style={{ fontWeight: 600 }}>{renewResult.bankDetails.accountName}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Account Number</td><td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{renewResult.bankDetails.accountNumber}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Sort Code</td><td style={{ fontWeight: 600 }}>{renewResult.bankDetails.sortCode}</td></tr>
                  </tbody>
                </table>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                  After making the transfer, upload your proof of payment below.
                </p>
                <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                  Upload Proof of Payment
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  style={{ marginBottom: 12 }}
                />
                {renewError && <p className="form-error visible" style={{ marginBottom: 12 }}>{renewError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRenewStep("init")}>← Back</button>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={handleProofUpload}
                    disabled={!proofFile || uploading}
                  >
                    {uploading ? "Uploading…" : "Submit Proof"}
                  </button>
                </div>
              </div>
            )}

            {renewStep === "done" && (
              <div style={{ textAlign: "center", padding: "var(--space-3) 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h4 style={{ marginBottom: 8 }}>Proof Submitted!</h4>
                <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
                  Your renewal payment proof has been submitted and is pending admin review. You'll be notified once approved.
                </p>
                <button className="btn btn-accent btn-sm" onClick={() => setShowRenewModal(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
