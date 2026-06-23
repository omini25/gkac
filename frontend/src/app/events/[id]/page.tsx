"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type EventItem } from "@/lib/api";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    // Election events have a prefix "election-" — fetch them from the elections endpoint
    if (id.startsWith("election-")) {
      api.getElectionEvents().then((res) => {
        if (res.data) {
          const found = res.data.events.find((e: any) => e.id === id);
          if (found) {
            setEvent(found as EventItem);
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
        setEvent(res.data.item);
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
          <h2>Not Found</h2>
          <p style={{ color: "var(--muted)", marginTop: 16 }}>
            {error === "Not found."
              ? "This event could not be found. It may have been removed or is no longer active."
              : "Failed to load this event."}
          </p>
          <Link href="/events" className="btn btn-outline" style={{ marginTop: 24 }}>
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const fd = formatEventDate(event.event_date);

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link
          href="/events"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
            marginBottom: 24,
            fontSize: 16,
          }}
        >
          ← Back to Events
        </Link>

        {event.image_url && (
          <img
            src={event.image_url}
            alt={event.title}
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: "var(--radius-lg)",
              marginBottom: 24,
            }}
          />
        )}

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24 }}>
          <div className="event-date-badge">
            <span className="day">{fd.day}</span>
            <span className="month">{fd.month}</span>
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", marginBottom: 12 }}>
              {event.title}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, color: "var(--muted)", fontSize: 16 }}>
              <span>📍 {event.location || "TBA"}</span>
              <span>📅 {fd.full}</span>
              {event.event_time && <span>🕐 {event.event_time}</span>}
            </div>
          </div>
        </div>

        {event.badge_label && (
          <span
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              background: event.badge_class
                ? "oklch(94% 0.04 155 / .25)"
                : "oklch(90% 0.02 260 / .20)",
              color: event.badge_class ? "var(--success)" : "var(--muted)",
              marginBottom: 24,
            }}
          >
            {event.badge_label}
          </span>
        )}

        {event.description && (
          <div
            style={{
              fontSize: 18,
              lineHeight: 1.75,
              color: "var(--fg)",
              whiteSpace: "pre-wrap",
            }}
          >
            {event.description}
          </div>
        )}

        {event.max_attendees && (
          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              background: "var(--green-light)",
              borderRadius: "var(--radius-md)",
              fontSize: 15,
              color: "var(--green-dark)",
            }}
          >
            <strong>Capacity:</strong> {event.max_attendees} attendees max
          </div>
        )}

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
          }}
        >
          <Link href="/events" className="btn btn-outline">
            ← Back to Events
          </Link>
        </div>
      </div>
    </div>
  );
}
