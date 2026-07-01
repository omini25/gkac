"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Meeting, type MeetingAttendee } from "@/lib/api";

const PLATFORM_OPTIONS = [
  { value: "zoom", label: "Zoom", icon: "🎥" },
  { value: "google_meet", label: "Google Meet", icon: "🔴" },
  { value: "microsoft_teams", label: "Microsoft Teams", icon: "💼" },
  { value: "other", label: "Other", icon: "🔗" },
];

const STATUS_OPTIONS = ["draft", "upcoming", "active", "completed", "cancelled"];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(t: string | null) {
  if (!t) return "—";
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
  const classes: Record<string, string> = {
    draft: "badge badge-pending",
    upcoming: "badge badge-active",
    active: "badge badge-active",
    completed: "badge badge-expired",
    cancelled: "badge badge-expired",
  };
  return <span className={classes[status] || "badge"}>{status}</span>;
}

function platformLabel(p: string) {
  const opt = PLATFORM_OPTIONS.find((o) => o.value === p);
  return opt ? `${opt.icon} ${opt.label}` : p;
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    meetingDate: "",
    meetingTime: "",
    timezone: "UTC",
    platform: "zoom",
    meetingLink: "",
    meetingId: "",
    passcode: "",
    dialInNumbers: "",
    accessType: "members_only",
    maxAttendees: "",
    recordingLink: "",
  });
  const [saving, setSaving] = useState(false);

  // Status change
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMeeting, setStatusMeeting] = useState<Meeting | null>(null);
  const [newStatus, setNewStatus] = useState("");

  // Attendees modal
  const [showAttendees, setShowAttendees] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  // Action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-wrapper")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ msg: "", type: "" }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
  }

  // ─── Load meetings ──────────────────────────────────────────────────────
  const loadMeetings = useCallback(async () => {
    setLoading(true);
    const res = await api.getMeetings();
    if (res.data) setMeetings(res.data.meetings);
    else showToast(res.error || "Failed to load meetings", "error");
    setLoading(false);
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // ─── Create / Edit meeting ──────────────────────────────────────────────
  function openCreateModal() {
    setEditingMeeting(null);
    setForm({
      title: "", description: "", meetingDate: "", meetingTime: "",
      timezone: "UTC", platform: "zoom", meetingLink: "", meetingId: "",
      passcode: "", dialInNumbers: "", accessType: "members_only",
      maxAttendees: "", recordingLink: "",
    });
    setShowModal(true);
  }

  function openEditModal(m: Meeting) {
    setEditingMeeting(m);
    setForm({
      title: m.title,
      description: m.description || "",
      meetingDate: m.meeting_date ? m.meeting_date.split("T")[0] : "",
      meetingTime: m.meeting_time || "",
      timezone: m.timezone || "UTC",
      platform: m.platform,
      meetingLink: m.meeting_link || "",
      meetingId: m.meeting_id || "",
      passcode: m.passcode || "",
      dialInNumbers: m.dial_in_numbers || "",
      accessType: m.access_type,
      maxAttendees: m.max_attendees?.toString() || "",
      recordingLink: m.recording_link || "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      meetingDate: form.meetingDate || null,
      meetingTime: form.meetingTime || null,
      timezone: form.timezone,
      platform: form.platform,
      meetingLink: form.meetingLink || null,
      meetingId: form.meetingId || null,
      passcode: form.passcode || null,
      dialInNumbers: form.dialInNumbers || null,
      accessType: form.accessType,
      maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees) : null,
      recordingLink: form.recordingLink || null,
    };

    let res;
    if (editingMeeting) {
      res = await api.updateMeeting(editingMeeting.id, payload);
    } else {
      res = await api.createMeeting(payload);
    }

    if (res.data) {
      showToast(editingMeeting ? "Meeting updated." : "Meeting created.", "success");
      setShowModal(false);
      loadMeetings();
    } else {
      showToast(res.error || "Failed to save meeting.", "error");
    }
    setSaving(false);
  }

  // ─── Status change ──────────────────────────────────────────────────────
  function openStatusModal(m: Meeting) {
    setStatusMeeting(m);
    setNewStatus(m.status);
    setShowStatusModal(true);
  }

  async function handleStatusChange() {
    if (!statusMeeting || !newStatus || newStatus === statusMeeting.status) {
      setShowStatusModal(false);
      return;
    }
    const res = await api.updateMeetingStatus(statusMeeting.id, newStatus);
    if (res.data) {
      showToast(`Status changed to "${newStatus}".`, "success");
      setShowStatusModal(false);
      loadMeetings();
    } else {
      showToast(res.error || "Failed to update status.", "error");
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting?")) return;
    const res = await api.deleteMeeting(id);
    if (res.data) {
      showToast("Meeting deleted.", "success");
      loadMeetings();
    } else {
      showToast(res.error || "Failed to delete meeting.", "error");
    }
  }

  // ─── Attendees ──────────────────────────────────────────────────────────
  async function openAttendees(m: Meeting) {
    setShowAttendees(m.id);
    setAttendeesLoading(true);
    const res = await api.getMeetingAttendees(m.id);
    if (res.data) setAttendees(res.data.attendees);
    else showToast(res.error || "Failed to load attendees", "error");
    setAttendeesLoading(false);
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toast */}
      {toast.msg && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
          <button className="toast-close" onClick={() => setToast({ msg: "", type: "" })}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Virtual Meetings</h2>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Create Meeting
        </button>
      </div>

      {/* Meetings Table */}
      {loading ? (
        <div className="loading">Loading meetings…</div>
      ) : meetings.length === 0 ? (
        <div className="empty-state">
          <p>No meetings have been created yet.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>Create Your First Meeting</button>
        </div>
      ) : (
        <div className="table-scroll-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Time</th>
                <th>Platform</th>
                <th>Access</th>
                <th>Attendees</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.title}</strong>
                    {m.description && <div className="truncate-desc">{m.description}</div>}
                  </td>
                  <td>{formatDate(m.meeting_date)}</td>
                  <td>{formatTime(m.meeting_time)}</td>
                  <td>{platformLabel(m.platform)}</td>
                  <td>
                    <span className="badge" style={{ fontSize: 11 }}>
                      {m.access_type === "members_only" ? "👤 Members" : "🔗 Anyone"}
                    </span>
                  </td>
                  <td>{m.attendee_count ?? 0}</td>
                  <td>{statusBadge(m.status)}</td>
                  <td>
                    <div className="dropdown-wrapper">
                      <button
                        className="btn btn-sm"
                        onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                      >
                        ⋯
                      </button>
                      {openMenuId === m.id && (
                        <div className="dropdown-menu open">
                          <button onClick={() => { setOpenMenuId(null); openEditModal(m); }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => { setOpenMenuId(null); openStatusModal(m); }}>
                            🔄 Change Status
                          </button>
                          <button onClick={() => { setOpenMenuId(null); openAttendees(m); }}>
                            👥 Attendees ({m.attendee_count ?? 0})
                          </button>
                          {m.meeting_link && (
                            <a href={m.meeting_link} target="_blank" rel="noopener noreferrer"
                               style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", textDecoration: "none", color: "inherit" }}>
                              🚪 Join Meeting
                            </a>
                          )}
                          <hr style={{ margin: "4px 0" }} />
                          <button
                            className="danger"
                            onClick={() => { setOpenMenuId(null); handleDelete(m.id); }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Create / Edit Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay open" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMeeting ? "Edit Meeting" : "Create Meeting"}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title *</label>
                <input className="form-control" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Monthly General Meeting — July 2026" />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Meeting agenda, topics to be discussed…" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Date</label>
                  <input className="form-control" type="date" value={form.meetingDate}
                    onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input className="form-control" type="time" value={form.meetingTime}
                    onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label>Timezone</label>
                <select className="form-control" value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                  <option value="UTC">UTC</option>
                  <option value="Africa/Lagos">West Africa (WAT — Lagos)</option>
                  <option value="America/New_York">Eastern (New York)</option>
                  <option value="America/Chicago">Central (Chicago)</option>
                  <option value="America/Denver">Mountain (Denver)</option>
                  <option value="America/Los_Angeles">Pacific (Los Angeles)</option>
                  <option value="Europe/London">UK (London)</option>
                  <option value="Europe/Paris">Central Europe (Paris/Berlin)</option>
                </select>
              </div>

              <hr style={{ margin: "16px 0" }} />

              <h4 style={{ margin: "0 0 12px" }}>Meeting Platform</h4>

              <div className="form-group">
                <label>Platform</label>
                <select className="form-control" value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Meeting Link</label>
                <input className="form-control" value={form.meetingLink}
                  onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/j/… or https://meet.google.com/…" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Meeting ID</label>
                  <input className="form-control" value={form.meetingId}
                    onChange={(e) => setForm({ ...form, meetingId: e.target.value })}
                    placeholder="Zoom ID (optional)" />
                </div>
                <div className="form-group">
                  <label>Passcode</label>
                  <input className="form-control" value={form.passcode}
                    onChange={(e) => setForm({ ...form, passcode: e.target.value })}
                    placeholder="Meeting passcode (optional)" />
                </div>
              </div>

              <div className="form-group">
                <label>Dial-in Numbers</label>
                <input className="form-control" value={form.dialInNumbers}
                  onChange={(e) => setForm({ ...form, dialInNumbers: e.target.value })}
                  placeholder="Optional phone dial-in numbers" />
              </div>

              <hr style={{ margin: "16px 0" }} />

              <h4 style={{ margin: "0 0 12px" }}>Settings</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label>Access Type</label>
                  <select className="form-control" value={form.accessType}
                    onChange={(e) => setForm({ ...form, accessType: e.target.value })}>
                    <option value="members_only">👤 Members Only (login required)</option>
                    <option value="anyone_with_link">🔗 Anyone with Link</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Attendees</label>
                  <input className="form-control" type="number" min={0} value={form.maxAttendees}
                    onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                    placeholder="Leave blank for unlimited" />
                </div>
              </div>

              <div className="form-group">
                <label>Recording Link (post-meeting)</label>
                <input className="form-control" value={form.recordingLink}
                  onChange={(e) => setForm({ ...form, recordingLink: e.target.value })}
                  placeholder="Link to recording after the meeting" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editingMeeting ? "Update Meeting" : "Create Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Status Change Modal ────────────────────────────────────────── */}
      {showStatusModal && statusMeeting && (
        <div className="modal-overlay open" onClick={() => setShowStatusModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Status</h3>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>Change status for <strong>{statusMeeting.title}</strong></p>
              <div className="form-group">
                <label>Current: <strong>{statusMeeting.status}</strong></label>
                <select className="form-control" value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusChange}
                disabled={newStatus === statusMeeting.status}>
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Attendees Modal ────────────────────────────────────────────── */}
      {showAttendees && (
        <div className="modal-overlay open" onClick={() => setShowAttendees(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Meeting Attendees</h3>
              <button className="modal-close" onClick={() => setShowAttendees(null)}>✕</button>
            </div>
            <div className="modal-body">
              {attendeesLoading ? (
                <div className="loading">Loading attendees…</div>
              ) : attendees.length === 0 ? (
                <p className="empty-state" style={{ padding: 20 }}>No attendees yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Membership Code</th>
                      <th>Joined At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendees.map((a) => (
                      <tr key={a.id}>
                        <td>{a.first_name ? `${a.first_name} ${a.last_name}` : a.name || "—"}</td>
                        <td>{a.email || "—"}</td>
                        <td>{a.membership_code || "—"}</td>
                        <td>{new Date(a.joined_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowAttendees(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
