"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api, type EventItem } from "@/lib/api";

type FilterType = "all" | "content" | "election" | "meeting";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    Promise.all([
      api.getContent<EventItem>("events"),
      api.getElectionEvents(),
      api.getMeetingEvents(),
    ]).then(([eventsRes, electionRes, meetingRes]) => {
      const contentEvents = (eventsRes.data?.items || []).map((e: EventItem) => ({ ...e, _source: "content" as const }));
      const electionEvents = (electionRes.data?.events || []).map((e: any) => ({ ...e, _source: "election" as const }));
      const meetingEvents = (meetingRes.data?.events || []).map((e: any) => ({ ...e, _source: "meeting" as const }));
      const merged = [...contentEvents, ...electionEvents, ...meetingEvents];
      merged.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      setEvents(merged as any);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { upcoming, past } = useMemo(() => {
    const up: any[] = [];
    const pa: any[] = [];
    for (const ev of events) {
      const d = new Date(ev.event_date);
      if (d >= today) up.push(ev);
      else pa.push(ev);
    }
    return { upcoming: up, past: pa.reverse() };
  }, [events, today]);

  const filteredUpcoming = useMemo(() => {
    if (filter === "all") return upcoming;
    return upcoming.filter((ev: any) => ev._source === filter);
  }, [upcoming, filter]);

  const filteredPast = useMemo(() => {
    if (filter === "all") return past;
    return past.filter((ev: any) => ev._source === filter);
  }, [past, filter]);

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "content", label: "Events" },
    { key: "election", label: "Elections" },
    { key: "meeting", label: "Meetings" },
  ];

  function fmtDate(d: string) {
    const dt = new Date(d);
    return { day: dt.getDate(), month: dt.toLocaleString("en", { month: "short" }) };
  }

  function EventCard({ ev }: { ev: any }) {
    const fd = fmtDate(ev.event_date);
    const isPast = new Date(ev.event_date) < today;

    const sourceColors: Record<string, { bg: string; fg: string; label: string }> = {
      content:  { bg: "oklch(92% 0.04 150 / 1)", fg: "var(--green-dark)", label: "Event" },
      election: { bg: "oklch(92% 0.06 280 / 1)", fg: "oklch(40% 0.12 275)",  label: "Election" },
      meeting:  { bg: "oklch(92% 0.05 45 / 1)",  fg: "oklch(45% 0.10 40)",   label: "Meeting" },
    };
    const sc = sourceColors[ev._source] || sourceColors.content;

    return (
      <Link href={`/events/${ev.id}`} className="event-card-link">
        <article className={`event-card ${isPast ? "event-card--past" : ""}`}>
          <div className="event-date-badge">
            <span className="day">{fd.day}</span>
            <span className="month">{fd.month}</span>
          </div>
          <div className="event-info">
            <div className="event-info-top">
              <span className="event-source-badge" style={{ background: sc.bg, color: sc.fg }}>
                {sc.label}
              </span>
              {ev.badge_label && (
                <span
                  className="event-custom-badge"
                  style={{
                    background: ev.badge_class ? "oklch(94% 0.04 155 / .25)" : "oklch(90% 0.02 260 / .20)",
                    color: ev.badge_class ? "var(--success)" : "var(--muted)",
                  }}
                >
                  {ev.badge_label}
                </span>
              )}
            </div>
            <h4>{ev.title}</h4>
            <div className="event-meta">
              <span>📍 {ev.location || "TBA"}</span>
              {ev.event_time && <span>🕐 {ev.event_time}</span>}
            </div>
            {ev.description && (
              <p className="event-desc">{ev.description}</p>
            )}
          </div>
          <div className="event-card-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4l6 6-6 6" />
            </svg>
          </div>
        </article>
      </Link>
    );
  }

  function EventSection({ title, items }: { title: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <section style={{ marginBottom: title === "Upcoming Events" ? 0 : "var(--space-5)" }}>
        <h3 className="event-section-title">{title}</h3>
        <div className="event-list">
          {items.map((ev: any) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── Hero ── */}
      <section className="page-section events-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Calendar</span>
            <h2>Events &amp; Activities</h2>
            <p>Stay connected with GKAC — conferences, workshops, chapter meetings, elections, and community gatherings.</p>
          </div>

          {/* ── Filter Tabs ── */}
          <div className="event-filters">
            {filters.map((f) => (
              <button
                key={f.key}
                className={`event-filter-btn ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Events List ── */}
      <div className="page-section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: 860 }}>
          {loading ? (
            <div className="events-loading">
              <span className="loader-dot" />
              <p>Loading events…</p>
            </div>
          ) : filteredUpcoming.length === 0 && filteredPast.length === 0 ? (
            <div className="events-empty">
              <div className="events-empty-icon">📅</div>
              <h3>No events found</h3>
              <p>There are no {filter !== "all" ? `${filter} ` : ""}events scheduled at this time. Check back later!</p>
            </div>
          ) : (
            <>
              <EventSection title="Upcoming Events" items={filteredUpcoming} />
              <EventSection title="Past Events" items={filteredPast} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
