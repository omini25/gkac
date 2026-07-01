"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Meeting } from "@/lib/api";

function formatDate(d: string | null) {
  if (!d) return "TBD";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(t: string | null) {
  if (!t) return "";
  try {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return t;
  }
}

function statusBadge(status: string) {
  const labels: Record<string, { cls: string; label: string }> = {
    draft: { cls: "badge badge-pending", label: "Draft" },
    upcoming: { cls: "badge badge-active", label: "Upcoming" },
    active: { cls: "badge badge-active", label: "Live Now" },
    completed: { cls: "badge badge-expired", label: "Ended" },
    cancelled: { cls: "badge badge-expired", label: "Cancelled" },
  };
  const info = labels[status] || { cls: "badge", label: status };
  return <span className={info.cls}>{info.label}</span>;
}

function platformInfo(platform: string) {
  const icons: Record<string, string> = {
    zoom: "🎥 Zoom",
    google_meet: "🔴 Google Meet",
    microsoft_teams: "💼 Microsoft Teams",
    other: "🔗 Link",
  };
  return icons[platform] || platform;
}

export default function DashboardMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [joinModal, setJoinModal] = useState<Meeting | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<any>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  }

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    const res = await api.getMeetings();
    if (res.data) setMeetings(res.data.meetings);
    else showToast(res.error || "Failed to load meetings", "error");
    setLoading(false);
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  async function handleJoin(m: Meeting) {
    setJoinModal(m);
    setJoinResult(null);
    setJoining(true);
    const res = await api.attendMeeting(m.id);
    if (res.data) {
      setJoinResult(res.data);
    } else {
      showToast(res.error || "Failed to register.", "error");
      setJoinModal(null);
    }
    setJoining(false);
  }

  const activeMeetings = meetings.filter((m) => m.status === "active");
  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming");
  const pastMeetings = meetings.filter((m) => ["completed", "cancelled"].includes(m.status));

  if (loading) {
    return <div className="loading" style={{ padding: 40, textAlign: "center" }}>Loading meetings…</div>;
  }

  return (
    <div>
      {toast.msg && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
          <button className="toast-close" onClick={() => setToast({ msg: "", type: "" })}>✕</button>
        </div>
      )}

      <h2 style={{ marginBottom: 8 }}>Virtual Meetings</h2>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Join upcoming meetings, access recordings, and stay connected.
      </p>

      {/* Live Now */}
      {activeMeetings.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 12, color: "#16a34a" }}>🟢 Live Now</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onJoin={handleJoin} variant="live" />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 12 }}>📅 Upcoming Meetings</h3>
        {upcomingMeetings.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px 0" }}>
            <p>No upcoming meetings scheduled.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcomingMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onJoin={handleJoin} variant="upcoming" />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {pastMeetings.length > 0 && (
        <section>
          <h3 style={{ marginBottom: 12 }}>📁 Past Meetings</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pastMeetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} onJoin={handleJoin} variant="past" />
            ))}
          </div>
        </section>
      )}

      {/* ─── Join / Meeting Details Modal ───────────────────────────────── */}
      {joinModal && (
        <div className="modal-overlay open" onClick={() => setJoinModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{joinResult ? "🎉 You're In!" : "Joining Meeting…"}</h3>
              <button className="modal-close" onClick={() => setJoinModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {joining && !joinResult ? (
                <div className="loading" style={{ textAlign: "center", padding: 20 }}>
                  Registering your attendance…
                </div>
              ) : joinResult ? (
                <div>
                  <p style={{ marginBottom: 16 }}>
                    <strong>{joinResult.meeting.title}</strong>
                  </p>

                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: 8 }}>
                      ✅ Attendance registered!
                    </p>
                    <p style={{ fontSize: 14, color: "#555" }}>
                      Click the button below to join the meeting.
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    <div><strong>Platform:</strong> {platformInfo(joinResult.meeting.platform)}</div>
                    {joinResult.meeting.meeting_id && (
                      <div><strong>Meeting ID:</strong> {joinResult.meeting.meeting_id}</div>
                    )}
                    {joinResult.meeting.passcode && (
                      <div><strong>Passcode:</strong> <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>{joinResult.meeting.passcode}</code></div>
                    )}
                    {joinResult.meeting.dial_in_numbers && (
                      <div><strong>Dial-in:</strong> {joinResult.meeting.dial_in_numbers}</div>
                    )}
                  </div>

                  {joinResult.meeting.meeting_link && (
                    <a
                      href={joinResult.meeting.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                    >
                      🚪 Join Meeting Now
                    </a>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setJoinModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Meeting Card Component ──────────────────────────────────────────────

function MeetingCard({
  meeting,
  onJoin,
  variant,
}: {
  meeting: Meeting;
  onJoin: (m: Meeting) => void;
  variant: "live" | "upcoming" | "past";
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      padding: 16,
      background: variant === "live" ? "#f0fdf4" : "#fff",
      border: variant === "live" ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
      borderRadius: 8,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: 16 }}>{meeting.title}</strong>
          {statusBadge(meeting.status)}
        </div>
        {meeting.description && (
          <p style={{ fontSize: 13, color: "#666", marginBottom: 6 }}>{meeting.description}</p>
        )}
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#555", flexWrap: "wrap" }}>
          <span>📅 {formatDate(meeting.meeting_date)}</span>
          {meeting.meeting_time && <span>⏰ {formatTime(meeting.meeting_time)}</span>}
          <span>{platformInfo(meeting.platform)}</span>
          <span>👤 {meeting.attendee_count ?? 0} attending</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {variant !== "past" && (
          <button
            className="btn btn-primary"
            onClick={() => onJoin(meeting)}
          >
            {variant === "live" ? "Join Now 🚪" : "Join Meeting"}
          </button>
        )}
        {variant === "past" && meeting.recording_link && (
          <a
            href={meeting.recording_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ textDecoration: "none" }}
          >
            🎥 Recording
          </a>
        )}
        {meeting.meeting_link && variant === "past" && !meeting.recording_link && (
          <span style={{ fontSize: 13, color: "#999", alignSelf: "center" }}>Ended</span>
        )}
      </div>
    </div>
  );
}
