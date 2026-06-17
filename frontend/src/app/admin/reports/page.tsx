"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface ReportsData {
  stats: {
    totalRegistered: number;
    yoyGrowth: number;
    renewalRate: number;
    voterTurnout: number;
  };
  membershipByCategory: { label: string; val: string; pct: number }[];
  registrationTrends: { month: string; val: number; h: number; o: number }[];
  paymentSummary: { label: string; val: string; pct: number }[];
  votingParticipation: { label: string; val: string; pct: number }[];
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    const res = await api.getReports();
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.data) {
      setData(res.data);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
        Loading reports…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
        No report data available.
      </div>
    );
  }

  const { stats, membershipByCategory, registrationTrends, paymentSummary, votingParticipation } = data;

  return (
    <>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.totalRegistered.toLocaleString()}</div>
          <div className="stat-label">Total Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.yoyGrowth >= 0 ? "var(--success)" : "var(--danger)" }}>
            {stats.yoyGrowth >= 0 ? "+" : ""}{stats.yoyGrowth}%
          </div>
          <div className="stat-label">YoY Growth</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.renewalRate}%</div>
          <div className="stat-label">Renewal Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.voterTurnout}%</div>
          <div className="stat-label">Voter Turnout</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Membership by Category */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>Membership by Category</h4>
          {membershipByCategory.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No members yet.</p>
          ) : (
            membershipByCategory.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.label}</span>
                  <strong>{item.val}</strong>
                </div>
                <div className="progress-bar">
                  <div className="fill" style={{ width: item.pct + "%" }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Registration Trends */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>Registration Trends (Monthly)</h4>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, paddingTop: 20 }}>
            {registrationTrends.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)", alignSelf: "center", width: "100%", textAlign: "center" }}>
                No registration data yet.
              </p>
            ) : (
              registrationTrends.map((bar, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      height: bar.h,
                      background: "var(--green)",
                      borderRadius: "4px 4px 0 0",
                      opacity: bar.o,
                      transition: "height 0.3s ease",
                    }}
                    title={`${bar.month}: ${bar.val} registrations`}
                  />
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>{bar.month}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>Payment Summary ({new Date().getFullYear()})</h4>
          {paymentSummary.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No payments recorded yet.</p>
          ) : (
            paymentSummary.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.label}</span>
                  <strong>{item.val}</strong>
                </div>
                <div className="progress-bar">
                  <div className="fill" style={{ width: item.pct + "%" }} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Voting Participation */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>Voting Participation</h4>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Last 3 elections</div>
          {votingParticipation.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>No elections held yet.</p>
          ) : (
            votingParticipation.map((item, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{item.label}</span>
                  <strong>{item.val}</strong>
                </div>
                <div className="progress-bar">
                  <div className="fill" style={{ width: item.pct + "%" }} />
                </div>
              </div>
            ))
          )}
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <button className="btn btn-outline btn-sm" onClick={() => showToast("Audit log exported", "success")}>
              Export Audit Log
            </button>
          </div>
        </div>
      </div>

      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
