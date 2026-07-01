"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type EventItem } from "@/lib/api";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Election events have a prefix "election-"
    if (id.startsWith("election-")) {
      api.getElectionEvents().then((res) => {
        if (res.data) {
          const found = res.data.events.find((e: any) => e.id === id);
          if (found) {
            setEvent({ ...found, _source: "election" });
          } else {
            setError("Not found.");
          }
        } else {
          setError("Not found.");
        }
        setLoading(false);
      });
      return;
    }

    // Meeting events have a prefix "meeting-"
    if (id.startsWith("meeting-")) {
      api.getMeetingEvents().then((res) => {
        if (res.data) {
          const found = res.data.events.find((e: any) => e.id === id);
          if (found) {
            setEvent({ ...found, _source: "meeting" });
          } else {
            setError("Not found.");
          }
        } else {
          setError("Not found.");
        }
        setLoading(false);
      });
      return;
    }

    api.getContentItem<EventItem>("events", id).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setEvent({ ...res.data.item, _source: "content" });
      }
      setLoading(false);
    });
  }, [id]);

  function formatEventDate(d: string) {
    const dt = new Date(d);
    return {
      day: dt.getDate(),
      month: dt.toLocaleString("en", { month: "short" }),
      full: dt.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }

  const sourceBadge: Record<string, { bg: string; fg: string; label: string }> = {
    content:  { bg: "oklch(92% 0.04 150 / 1)", fg: "var(--green-dark)", label: "Event" },
    election: { bg: "oklch(92% 0.06 280 / 1)", fg: "oklch(40% 0.12 275)",  label: "Election" },
    meeting:  { bg: "oklch(92% 0.05 45 / 1)",  fg: "oklch(45% 0.10 40)",   label: "Meeting" },
  };

  if (loading) {
    return (
      <div className="page-section">
        <div className="container" style={{ textAlign: "center", padding: "80px 0" }}>
          <span className="loader-dot" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page-section">
        <div className="container" style={{ textAlign: "center", padding: "80px 0" }}>
          <div className="events-empty" style={{ marginTop: 0 }}>
            <div className="events-empty-icon">🔍</div>
            <h3>Event Not Found</h3>
            <p>
              {error === "Not found."
                ? "This event could not be found. It may have been removed or is no longer active."
                : "Failed to load this event."}
            </p>
            <Link href="/events" className="btn btn-outline" style={{ marginTop: 24 }}>
              ← Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fd = formatEventDate(event.event_date);
  const sc = sourceBadge[event._source] || sourceBadge.content;
  const isPast = new Date(event.event_date) < new Date(new Date().toDateString());

  return (
    <>
      {/* ── Hero Banner ── */}
      <section className={`event-detail-hero ${event.image_url ? "has-image" : ""}`}>
        {event.image_url && (
          <div className="event-detail-hero-bg">
            <img src={event.image_url} alt="" aria-hidden />
          </div>
        )}
        <div className="event-detail-hero-overlay" />
        <div className="container event-detail-hero-content">
          <Link href="/events" className="event-detail-back">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4l-4 4 4 4" />
            </svg>
            Back to Events
          </Link>
          <span className="event-source-badge" style={{ background: sc.bg, color: sc.fg, alignSelf: "flex-start" }}>
            {sc.label}
          </span>
          <h1>{event.title}</h1>
          <div className="event-detail-hero-meta">
            <span>📅 {fd.full}</span>
            <span>📍 {event.location || "TBA"}</span>
            {event.event_time && <span>🕐 {event.event_time}</span>}
          </div>
          {event.badge_label && (
            <span
              className="event-custom-badge"
              style={{
                background: event.badge_class ? "oklch(94% 0.04 155 / .25)" : "oklch(90% 0.02 260 / .20)",
                color: event.badge_class ? "var(--success)" : "var(--muted)",
                alignSelf: "flex-start",
              }}
            >
              {event.badge_label}
            </span>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <div className="page-section">
        <div className="container event-detail-layout">
          {/* Main Content */}
          <div className="event-detail-main">
            {event.description ? (
              <div className="event-detail-description">{event.description}</div>
            ) : (
              <p style={{ color: "var(--muted)", fontStyle: "italic" }}>No additional details available for this event.</p>
            )}

            {/* Meeting CTA */}
            {event.meeting_id && (
              <div className="event-detail-cta-card">
                <div className="event-detail-cta-icon">🎥</div>
                <div>
                  <h4>Virtual Meeting</h4>
                  <p>This event will be held online. Join via the link below.</p>
                  <Link
                    href={`/meetings/join/${event.meeting_id}`}
                    className="btn btn-accent"
                    style={{ textDecoration: "none", marginTop: 8 }}
                  >
                    Join Virtual Meeting
                  </Link>
                  {event.meeting_platform && (
                    <span className="event-detail-platform">
                      via{" "}
                      {event.meeting_platform === "google_meet"
                        ? "Google Meet"
                        : event.meeting_platform === "microsoft_teams"
                          ? "Microsoft Teams"
                          : event.meeting_platform === "zoom"
                            ? "Zoom"
                            : event.meeting_platform}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="event-detail-footer">
              <Link href="/events" className="btn btn-outline">
                ← All Events
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="event-detail-sidebar">
            <div className="event-detail-sidebar-card">
              <div className="event-date-badge event-detail-sidebar-date">
                <span className="day">{fd.day}</span>
                <span className="month">{fd.month}</span>
              </div>
              <h4>{event.title}</h4>
              <ul className="event-detail-sidebar-meta">
                <li>
                  <span className="meta-icon">📅</span>
                  <div>
                    <strong>Date</strong>
                    <span>{fd.full}</span>
                  </div>
                </li>
                <li>
                  <span className="meta-icon">📍</span>
                  <div>
                    <strong>Location</strong>
                    <span>{event.location || "TBA"}</span>
                  </div>
                </li>
                {event.event_time && (
                  <li>
                    <span className="meta-icon">🕐</span>
                    <div>
                      <strong>Time</strong>
                      <span>{event.event_time}</span>
                    </div>
                  </li>
                )}
                {event.max_attendees && (
                  <li>
                    <span className="meta-icon">👥</span>
                    <div>
                      <strong>Capacity</strong>
                      <span>{event.max_attendees} attendees</span>
                    </div>
                  </li>
                )}
                <li>
                  <span className="meta-icon">🏷️</span>
                  <div>
                    <strong>Type</strong>
                    <span>{sc.label}</span>
                  </div>
                </li>
                <li>
                  <span className="meta-icon">{isPast ? "✅" : "⏳"}</span>
                  <div>
                    <strong>Status</strong>
                    <span>{isPast ? "Completed" : "Upcoming"}</span>
                  </div>
                </li>
              </ul>

              {event.meeting_id && (
                <Link
                  href={`/meetings/join/${event.meeting_id}`}
                  className="btn btn-accent"
                  style={{ textDecoration: "none", width: "100%", justifyContent: "center", marginTop: 16 }}
                >
                  🎥 Join Meeting
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
