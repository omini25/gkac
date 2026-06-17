"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, getExpiryInfo } from "@/lib/useAuth";
import { api, type NewsItem, type EventItem, type Election } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(0);
  const [hrs, setHrs] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

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
      const [newsRes, eventsRes, electionsRes] = await Promise.all([
        api.getContent<NewsItem>("news"),
        api.getContent<EventItem>("events"),
        api.getElections(),
      ]);
      if (newsRes.data) setNews(newsRes.data.items.slice(0, 3));
      if (eventsRes.data) {
        const upcoming = eventsRes.data.items
          .filter((e) => new Date(e.event_date) >= new Date())
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .slice(0, 3);
        setEvents(upcoming);
      }
      if (electionsRes.data) setElections(electionsRes.data.elections);
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

  return (
    <>
      {/* Status + Renewal Banner */}
      <div
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
          {expiry.expired && (
            <button className="btn btn-accent btn-sm" type="button">
              Renew Now
            </button>
          )}
        </div>
      </div>

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
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>{formattedCategory}</div>
          <div className="stat-label">Category</div>
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
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</p>
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
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</p>
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
    </>
  );
}
