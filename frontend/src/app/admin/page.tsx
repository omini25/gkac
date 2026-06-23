"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface DashboardData {
  stats: {
    totalMembers: number;
    activeMembers: number;
    expiringSoon: number;
    pendingApplications: number;
    pendingApprovalCount: number;
  };
  activity: { type: string; text: string; time: string }[];
}

function activityIcon(type: string) {
  switch (type) {
    case "approval": return <span className="activity-dot approval" />;
    case "payment":  return <span className="activity-dot payment" />;
    case "election": return <span className="activity-dot election" />;
    default:         return <span className="activity-dot system" />;
  }
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [electionEvents, setElectionEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const [dashRes, eventsRes] = await Promise.all([
      api.getDashboard(),
      api.getElectionEvents(),
    ]);
    if (dashRes.error) {
      setError(dashRes.error);
    } else if (dashRes.data) {
      setData(dashRes.data);
    }
    if (eventsRes.data) {
      const upcoming = eventsRes.data.events
        .filter((e: any) => new Date(e.event_date) >= new Date())
        .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 6);
      setElectionEvents(upcoming);
    }
    setLoading(false);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading dashboard…</div>;
  }

  if (error) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--danger)" }}>Error: {error}</div>;
  }

  if (!data) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No data available.</div>;
  }

  const { stats, activity } = data;

  return (
    <>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats.totalMembers.toLocaleString()}</div>
          <div className="stat-label">Total Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats.activeMembers.toLocaleString()}</div>
          <div className="stat-label">Active Members</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.expiringSoon > 0 ? "var(--warn)" : "var(--text)" }}>
            {stats.expiringSoon.toLocaleString()}
          </div>
          <div className="stat-label">Expiring Within 30 Days</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.pendingApplications > 0 ? "var(--warn)" : "var(--text)" }}>
            {stats.pendingApplications.toLocaleString()}
          </div>
          <div className="stat-label">Pending Applications</div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>💰 Membership Fee Structure</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="fee-table" style={{ margin: 0, width: "100%" }}>
            <thead>
              <tr><th>Fee Type</th><th>Amount</th><th>Frequency</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Membership Fee</strong></td>
                <td>₦10,000</td>
                <td>One-time</td>
              </tr>
              <tr>
                <td><strong>Annual Dues</strong></td>
                <td>₦24,000</td>
                <td>Yearly</td>
              </tr>
              <tr>
                <td><strong>Annual Developmental Fee</strong></td>
                <td>₦50,000</td>
                <td>Yearly</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/admin/members" className="btn btn-accent" style={{ width: "100%" }}>
              Review Pending Applications ({stats.pendingApplications})
            </Link>
            <Link href="/admin/members" className="btn btn-outline" style={{ width: "100%" }}>
              View Upcoming Renewals ({stats.expiringSoon})
            </Link>
            <Link href="/admin/elections" className="btn btn-outline" style={{ width: "100%" }}>
              Manage Elections
            </Link>
            <Link href="/admin/content" className="btn btn-outline" style={{ width: "100%" }}>
              Create Announcement
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          {activity.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)", padding: 16 }}>No recent activity.</p>
          ) : (
            <ul className="activity-list">
              {activity.map((item, i) => (
                <li key={i}>
                  {activityIcon(item.type)}
                  <div>
                    <span dangerouslySetInnerHTML={{ __html: item.text }} />
                    <br />
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>{item.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Election Timeline Events */}
      {electionEvents.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3>📅 Election Timeline</h3>
            <Link href="/admin/elections" style={{ fontSize: 13 }}>Manage Elections →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {electionEvents.map((ev: any) => (
              <div
                key={ev.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  borderLeft: `4px solid ${ev.badge_label === "Ongoing" ? "var(--accent)" : ev.badge_label === "Upcoming" ? "var(--warn)" : "var(--border)"}`,
                  borderRadius: "var(--radius-sm)", background: "var(--bg)",
                }}
              >
                <div style={{ minWidth: 50, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                    {new Date(ev.event_date).getDate()}
                  </div>
                  <div style={{ fontSize: 9, textTransform: "uppercase", color: "var(--muted)" }}>
                    {new Date(ev.event_date).toLocaleString("en", { month: "short" })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{ev.description}</div>
                </div>
                <span className={`badge ${ev.badge_label === "Ongoing" ? "badge-active" : ev.badge_label === "Upcoming" ? "badge-pending" : "badge-expired"}`}>
                  {ev.badge_label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
