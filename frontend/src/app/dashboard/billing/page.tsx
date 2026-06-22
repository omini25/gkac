"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { api, type PaymentRecord, type RenewMembershipResult } from "@/lib/api";

export default function BillingPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ─── Dues payment modal state ──────────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState(false);
  const [payType, setPayType] = useState<"annualDue" | "devFee">("annualDue");
  const [payStep, setPayStep] = useState<"init" | "details" | "upload" | "done">("init");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [payResult, setPayResult] = useState<RenewMembershipResult | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.getPaymentHistory();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setPayments(res.data.payments);
      }
      setLoading(false);
    }
    load();
  }, []);

  function formatNaira(kobo: number) {
    return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: "Pending", cls: "badge-warn" },
      awaiting_verification: { label: "Awaiting Verification", cls: "badge-warn" },
      success: { label: "Confirmed", cls: "badge-success" },
      failed: { label: "Failed", cls: "badge-danger" },
      abandoned: { label: "Abandoned", cls: "badge-muted" },
    };
    const s = map[status] || { label: status, cls: "badge-muted" };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  }

  function paymentTypeLabel(type: string) {
    return type === "renewal" ? "Renewal" : type === "registration" ? "Registration" : type;
  }

  const annualDuePaid = user?.annualDuePaid ?? false;
  const devFeePaid = user?.annualDevelopmentalFeePaid ?? false;
  const currentYear = new Date().getFullYear();

  function openPayModal(type: "annualDue" | "devFee") {
    setPayType(type);
    setPayStep("init");
    setPayError("");
    setPayResult(null);
    setProofFile(null);
    setShowPayModal(true);
  }

  async function handlePayInit() {
    if (!user) return;
    setPayError("");
    const amountKobo = payType === "annualDue" ? 24_000 * 100 : 50_000 * 100;
    setPayLoading(true);
    const res = await api.renewMembership(amountKobo, user.email);
    setPayLoading(false);
    if (res.error) { setPayError(res.error); return; }
    if (res.data) {
      setPayResult(res.data);
      setPayStep("details");
    }
  }

  async function handleProofUpload() {
    if (!proofFile || !payResult || !user) return;
    setUploading(true);
    setPayError("");
    const res = await api.uploadPaymentProof(user.id, payResult.paymentId, proofFile);
    setUploading(false);
    if (res.error) { setPayError(res.error); return; }
    setPayStep("done");
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Billing &amp; Payment History</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0" }}>
          View your past payments and renewal records.
        </p>
      </div>

      {/* Dues Status */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 12 }}>📋 Dues Status</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {/* Annual Dues */}
          <div style={{
            padding: 16, borderRadius: "var(--radius-md)", textAlign: "center",
            background: annualDuePaid ? "var(--green-light)" : "var(--bg)",
            border: `1px solid ${annualDuePaid ? "var(--green)" : "var(--border)"}`,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Annual Dues</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>₦24,000</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Due: {currentYear}</div>
            <div style={{ marginTop: 4 }}>
              {annualDuePaid
                ? <span className="status-badge status-active">● Paid</span>
                : <span className="status-badge status-expired">● Pending</span>
              }
            </div>
            {!annualDuePaid && (
              <button className="btn btn-accent btn-sm" style={{ marginTop: 8 }} onClick={() => openPayModal("annualDue")}>
                Pay Now
              </button>
            )}
          </div>

          {/* Annual Developmental Fee */}
          <div style={{
            padding: 16, borderRadius: "var(--radius-md)", textAlign: "center",
            background: devFeePaid ? "var(--green-light)" : "var(--bg)",
            border: `1px solid ${devFeePaid ? "var(--green)" : "var(--border)"}`,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Annual Developmental Fee</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>₦50,000</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Due: {currentYear}</div>
            <div style={{ marginTop: 4 }}>
              {devFeePaid
                ? <span className="status-badge status-active">● Paid</span>
                : <span className="status-badge status-expired">● Pending</span>
              }
            </div>
            {!devFeePaid && (
              <button className="btn btn-accent btn-sm" style={{ marginTop: 8 }} onClick={() => openPayModal("devFee")}>
                Pay Now
              </button>
            )}
          </div>

          {/* Membership Fee */}
          <div style={{
            padding: 16, borderRadius: "var(--radius-md)", textAlign: "center",
            background: "var(--green-light)",
            border: "1px solid var(--green)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Membership Fee</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>₦10,000</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>One-time</div>
            <div style={{ marginTop: 4 }}>
              <span className="status-badge status-active">● Paid</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-5)" }}>
          <p style={{ color: "var(--muted)" }}>Loading payment history…</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-5)", borderLeft: "4px solid var(--error)" }}>
          <p style={{ color: "var(--error)" }}>{error}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "var(--space-5)" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
          <h4 style={{ marginBottom: 8 }}>No Payments Yet</h4>
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            Your payment and renewal history will appear here.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Reference</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600 }}>Type</th>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>Amount</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>{formatDate(p.created_at)}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {p.reference}
                  </td>
                  <td style={{ padding: "12px 16px" }}>{paymentTypeLabel(p.payment_type)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                    {formatNaira(p.amount_kobo)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>{statusBadge(p.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {payments.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 12 }}>Summary</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Payments</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{payments.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Total Amount</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {formatNaira(payments.reduce((sum, p) => sum + p.amount_kobo, 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Confirmed</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success)" }}>
                {payments.filter((p) => p.status === "success").length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Pending</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--warn)" }}>
                {payments.filter((p) => p.status === "pending" || p.status === "awaiting_verification").length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dues Payment Modal ──────────────────────────────────────────── */}
      {showPayModal && (
        <div className="modal-overlay open" onClick={() => { if (payStep !== "upload" && payStep !== "details") setShowPayModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3>
              {payType === "annualDue" ? "Pay Annual Dues" : "Pay Developmental Fee"}
            </h3>
            <button className="modal-close" onClick={() => setShowPayModal(false)} disabled={payLoading || uploading}>✕</button>

            {payStep === "init" && (
              <div>
                <p style={{ fontSize: 14, marginBottom: 16 }}>
                  You are about to pay <strong>{formatNaira(payType === "annualDue" ? 24_000 * 100 : 50_000 * 100)}</strong> for your {payType === "annualDue" ? "Annual Dues" : "Annual Developmental Fee"} ({currentYear}).
                </p>
                {payError && <p className="form-error visible" style={{ marginBottom: 12 }}>{payError}</p>}
                <button
                  className="btn btn-accent"
                  onClick={handlePayInit}
                  disabled={payLoading}
                  style={{ width: "100%" }}
                >
                  {payLoading ? "Initialising…" : `Proceed to Pay ${formatNaira(payType === "annualDue" ? 24_000 * 100 : 50_000 * 100)}`}
                </button>
              </div>
            )}

            {payStep === "details" && payResult && (
              <div>
                <div className="card" style={{ background: "var(--green-light)", marginBottom: 16, padding: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Payment Reference</p>
                  <p style={{ fontSize: 18, fontFamily: "var(--font-mono)", fontWeight: 700, margin: "4px 0 0" }}>
                    {payResult.reference}
                  </p>
                </div>
                <p style={{ fontSize: 14, marginBottom: 12 }}>
                  Transfer the amount to the account below and use your <strong>Reference</strong> as the narration.
                </p>
                <table style={{ width: "100%", fontSize: 14, marginBottom: 16 }}>
                  <tbody>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Bank</td><td style={{ fontWeight: 600 }}>{payResult.bankDetails.bankName}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Account Name</td><td style={{ fontWeight: 600 }}>{payResult.bankDetails.accountName}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Account Number</td><td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{payResult.bankDetails.accountNumber}</td></tr>
                    <tr><td style={{ padding: "4px 0", color: "var(--muted)" }}>Sort Code</td><td style={{ fontWeight: 600 }}>{payResult.bankDetails.sortCode}</td></tr>
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
                  style={{ marginBottom: 12, fontSize: 14 }}
                />
                {proofFile && (
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                    Selected: {proofFile.name} ({(proofFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                {payError && <p className="form-error visible" style={{ marginBottom: 12 }}>{payError}</p>}
                <button
                  className="btn btn-accent"
                  onClick={handleProofUpload}
                  disabled={uploading || !proofFile}
                  style={{ width: "100%" }}
                >
                  {uploading ? "Uploading…" : "Upload Proof of Payment"}
                </button>
              </div>
            )}

            {payStep === "done" && (
              <div style={{ textAlign: "center", padding: "var(--space-3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h4 style={{ marginBottom: 8 }}>Proof Submitted!</h4>
                <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
                  Your proof of payment has been submitted successfully. An admin will verify your payment shortly.
                </p>
                <button
                  className="btn btn-accent"
                  onClick={() => setShowPayModal(false)}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
