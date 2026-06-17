"use client";

import { useState, useEffect } from "react";
import { api, type EventItem } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContent<EventItem>("events").then((res) => {
      if (res.data) setEvents(res.data.items);
      setLoading(false);
    });
  }, []);

  function fmtDate(d: string) {
    const dt = new Date(d);
    return { day: dt.getDate(), month: dt.toLocaleString("en", { month: "short" }) };
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Upcoming Events</h2>
          <p>Mark your calendar — conferences, workshops, chapter meetings, and more.</p>
        </div>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "var(--muted)" }}>Loading events…</p>
          ) : events.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--muted)" }}>No upcoming events.</p>
          ) : (
            events.map((ev) => {
              const fd = fmtDate(ev.event_date);
              return (
                <div key={ev.id} className="event-card">
                  <div className="event-date-badge">
                    <span className="day">{fd.day}</span>
                    <span className="month">{fd.month}</span>
                  </div>
                  <div className="event-info">
                    <h4>{ev.title}</h4>
                    <div className="event-meta">
                      <span>📍 {ev.location || "TBA"}</span>
                      {ev.event_time && <span>🕐 {ev.event_time}</span>}
                    </div>
                    {ev.description && <p style={{ marginTop: 6 }}>{ev.description}</p>}
                    {ev.badge_label && (
                      <span style={{
                        display: "inline-block", padding: "4px 12px", borderRadius: 999,
                        fontSize: 12, fontWeight: 600,
                        background: ev.badge_class ? "oklch(94% 0.04 155 / .25)" : "oklch(90% 0.02 260 / .20)",
                        color: ev.badge_class ? "var(--success)" : "var(--muted)",
                      }}>{ev.badge_label}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
