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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const res = await api.getDashboard();
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setData(res.data);
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
    </>
  );
}
