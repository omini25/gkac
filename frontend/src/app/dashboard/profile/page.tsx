"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "settings">("info");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [saved, setSaved] = useState(false);

  // Populate editable fields once user loads
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading || !user) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "var(--space-5)" }}>
        <p style={{ color: "var(--muted)" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === "info" ? " active" : ""}`} onClick={() => setActiveTab("info")}>
          Profile
        </button>
        <button className={`tab-btn${activeTab === "settings" ? " active" : ""}`} onClick={() => setActiveTab("settings")}>
          Settings
        </button>
      </div>

      {/* Profile Info Tab */}
      <div className={`tab-panel${activeTab === "info" ? " active" : ""}`}>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Personal Information</h3>
          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
            <hr style={{ borderColor: "var(--border)", margin: "20px 0" }} />
            <h4 style={{ marginBottom: 12 }}>
              Locked Fields{" "}
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>
                — Contact admin to update
              </span>
            </h4>
            <div className="form-row">
              <div className="form-group">
                <label>Membership Number</label>
                <input type="text" value={user.membershipCode || "—"} readOnly disabled />
              </div>
              <div className="form-group">
                <label>Membership Category</label>
                <input type="text" value={user.membershipCategory || "—"} readOnly disabled />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Application Status</label>
                <input type="text" value={user.applicationStatus || "—"} readOnly disabled />
              </div>
              <div className="form-group">
                <label>Expiry Date</label>
                <input
                  type="text"
                  value={user.membershipExpiresAt ? new Date(user.membershipExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "—"}
                  readOnly disabled
                />
              </div>
            </div>
            <button type="submit" className="btn btn-accent" style={{ marginTop: 12 }}>
              {saved ? "✓ Saved" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>

      {/* Settings Tab */}
      <div className={`tab-panel${activeTab === "settings" ? " active" : ""}`}>
        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Account Settings</h3>
          <div style={{ marginBottom: 24 }}>
            {[
              { title: "Email Notifications", desc: "Receive announcements, event reminders, and renewal alerts.", toggle: true, checked: true },
              { title: "SMS Alerts", desc: "Get urgent updates via text message.", toggle: true, checked: false },
            ].map((row) => (
              <div
                key={row.title}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <strong>{row.title}</strong>
                  <br />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{row.desc}</span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    defaultChecked={row.checked}
                    style={{ width: 18, height: 18, accentColor: "var(--green)" }}
                  />{" "}
                  {row.checked ? "Enabled" : "Disabled"}
                </label>
              </div>
            ))}
          </div>
          <h4 style={{ marginBottom: 12 }}>Change Password</h4>
          <form onSubmit={(e) => { e.preventDefault(); alert("Password updated."); }}>
            <div className="form-group">
              <label>Current Password</label>
              <input type="password" placeholder="Enter current password" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Min. 8 characters" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" placeholder="Re-enter new password" />
            </div>
            <button className="btn btn-primary">Update Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
