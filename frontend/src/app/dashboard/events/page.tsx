"use client";

import { useState, useEffect } from "react";
import { api, type EventItem } from "@/lib/api";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpModal, setRsvpModal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getContent<EventItem>("events"),
      api.getElectionEvents(),
    ]).then(([eventsRes, electionRes]) => {
      const merged = [
        ...(eventsRes.data?.items || []),
        ...(electionRes.data?.events || []),
      ];
      merged.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setEvents(merged);
      setLoading(false);
    });
  }, []);

  function confirmRsvp(e: React.FormEvent) {
    e.preventDefault();
    setRsvpModal(null);
  }

  function fmtDate(d: string) {
    const dt = new Date(d);
    return { day: dt.getDate(), month: dt.toLocaleString("en", { month: "short" }).toUpperCase() };
  }

  function isOpen(status: string | undefined): boolean {
    return status === "open" || !status;
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Upcoming Events</h3>
          {!loading && <span style={{ fontSize: 13, color: "var(--muted)" }}>{events.length} event{events.length !== 1 ? "s" : ""}</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading events…</p>
          ) : events.length === 0 ? (
            <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No upcoming events.</p>
          ) : (
            events.map((ev) => {
              const fd = fmtDate(ev.event_date);
              const location = [ev.location, ev.event_time].filter(Boolean).join(" · ");
              return (
                <div
                  key={ev.id}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "center",
                    padding: 16,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      minWidth: 52,
                      height: 52,
                      borderRadius: "var(--radius-md)",
                      background: "var(--navy)",
                      color: "#fff",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    {fd.day}
                    <span style={{ fontSize: 9 }}>{fd.month}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <strong>{ev.title}</strong>
                    {ev.description && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{ev.description}</div>}
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>{location}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isOpen(ev.status) ? (
                      <button className="btn btn-accent btn-sm" onClick={() => setRsvpModal(ev.title)}>
                        RSVP
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {ev.badge_label || ev.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RSVP Modal */}
      <div className={`modal-overlay${rsvpModal ? " open" : ""}`} onClick={() => setRsvpModal(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setRsvpModal(null)}>✕</button>
          <h3>RSVP: {rsvpModal}</h3>
          <form onSubmit={confirmRsvp}>
            <div className="form-group">
              <label>Number of Attendees</label>
              <select>
                <option>1</option><option>2</option><option>3</option><option>4</option>
              </select>
            </div>
            <div className="form-group">
              <label>Dietary Requirements (if any)</label>
              <input type="text" placeholder="e.g. Vegetarian, gluten-free, none" />
            </div>
            <div className="form-group">
              <label>Any special requirements?</label>
              <textarea rows={2} placeholder="Accessibility needs, seating preferences…" />
            </div>
            <button type="submit" className="btn btn-accent btn-lg" style={{ width: "100%" }}>
              Confirm RSVP
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
