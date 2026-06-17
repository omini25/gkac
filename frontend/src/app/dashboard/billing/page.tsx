"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { api, type PaymentRecord } from "@/lib/api";

export default function BillingPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Billing &amp; Payment History</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0" }}>
          View your past payments and renewal records.
        </p>
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
    </>
  );
}
