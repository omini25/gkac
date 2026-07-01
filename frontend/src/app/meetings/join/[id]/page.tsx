"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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

function platformLabel(p: string) {
  const icons: Record<string, string> = {
    zoom: "🎥 Zoom",
    google_meet: "🔴 Google Meet",
    microsoft_teams: "💼 Microsoft Teams",
    other: "🔗 Online Meeting",
  };
  return icons[p] || p;
}

export default function PublicMeetingJoinPage() {
  const params = useParams();
  const id = params?.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registered, setRegistered] = useState(false);
  const [joinInfo, setJoinInfo] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await api.getMeeting(id);
      if (res.data) {
        setMeeting(res.data.meeting);
        // If member-only, redirect to login
        if (res.data.meeting.access_type === "members_only") {
          setError("This meeting is for members only. Please log in to join.");
        }
      } else {
        setError(res.error || "Meeting not found.");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleRegister() {
    if (!name.trim() || !email.trim()) {
      setRegError("Name and email are required.");
      return;
    }
    setRegistering(true);
    setRegError("");
    const res = await api.attendMeeting(id, { name, email });
    if (res.data) {
      setRegistered(true);
      setJoinInfo(res.data);
    } else {
      setRegError(res.error || "Failed to register.");
    }
    setRegistering(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div className="loading">Loading meeting details…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h2 style={{ marginBottom: 8 }}>Meeting Access</h2>
          {error === "This meeting is for members only. Please log in to join." ? (
            <div>
              <p style={{ color: "#666", marginBottom: 20 }}>{error}</p>
              <a href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                Log In to Join
              </a>
            </div>
          ) : (
            <p style={{ color: "#666" }}>{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <p>Meeting not found.</p>
      </div>
    );
  }

  // Already registered — show join info
  if (registered && joinInfo) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 20 }}>
        <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h2 style={{ margin: "0 0 4px" }}>You're In!</h2>
            <p style={{ color: "#666" }}>Attendance registered for <strong>{joinInfo.meeting.title}</strong></p>
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <p style={{ color: "#16a34a", fontWeight: 600, margin: 0, fontSize: 14 }}>
              ✅ You've been registered as an attendee.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#666" }}>Date</span>
              <span>{formatDate(meeting.meeting_date)}</span>
            </div>
            {meeting.meeting_time && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#666" }}>Time</span>
                <span>{formatTime(meeting.meeting_time)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ color: "#666" }}>Platform</span>
              <span>{platformLabel(meeting.platform)}</span>
            </div>
            {joinInfo.meeting.meeting_id && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#666" }}>Meeting ID</span>
                <span>{joinInfo.meeting.meeting_id}</span>
              </div>
            )}
            {joinInfo.meeting.passcode && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#666" }}>Passcode</span>
                <code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 4 }}>{joinInfo.meeting.passcode}</code>
              </div>
            )}
          </div>

          {joinInfo.meeting.meeting_link && (
            <a
              href={joinInfo.meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none", width: "100%" }}
            >
              🚪 Join Meeting Now
            </a>
          )}
        </div>
      </div>
    );
  }

  // Registration form for "anyone_with_link" meetings
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: 20 }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        {/* Meeting Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔗</div>
          <h2 style={{ margin: "0 0 4px" }}>{meeting.title}</h2>
          {meeting.description && (
            <p style={{ color: "#666", margin: "8px 0 0", fontSize: 14 }}>{meeting.description}</p>
          )}
        </div>

        {/* Meeting Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, padding: 16, background: "#f9fafb", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <span>📅</span>
            <span>{formatDate(meeting.meeting_date)}</span>
          </div>
          {meeting.meeting_time && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <span>⏰</span>
              <span>{formatTime(meeting.meeting_time)}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <span>🎥</span>
            <span>{platformLabel(meeting.platform)}</span>
          </div>
        </div>

        {/* Registration Form */}
        <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Register to Join</h3>

        {regError && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
            {regError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-group">
            <label>Your Name *</label>
            <input
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="form-group">
            <label>Email Address *</label>
            <input
              className="form-control"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
            onClick={handleRegister}
            disabled={registering}
          >
            {registering ? "Registering…" : "Register & Join Meeting"}
          </button>
        </div>

        <p style={{ fontSize: 12, color: "#999", textAlign: "center", marginTop: 12 }}>
          Your name and email will be used to register your attendance.
        </p>
      </div>
    </div>
  );
}
