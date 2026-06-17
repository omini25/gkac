"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "settings">("info");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    alert("Profile updated successfully.");
  }

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : "??";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "—";
  const maskedNIN = user?.membershipCode ? `${user.membershipCode.slice(0, 4)}••••` : "—";

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
                <input type="text" defaultValue={user?.firstName || ""} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" defaultValue={user?.lastName || ""} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" defaultValue={user?.email || ""} />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" defaultValue={user?.phone || ""} />
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
                <input type="text" defaultValue={user?.membershipCode || "—"} disabled />
              </div>
              <div className="form-group">
                <label>Membership Code</label>
                <input type="text" defaultValue={maskedNIN} disabled />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Membership Category</label>
                <input type="text" defaultValue={user?.membershipCategory || "—"} disabled />
              </div>
              <div className="form-group">
                <label>Status</label>
                <input type="text" defaultValue={user?.applicationStatus || "—"} disabled />
              </div>
            </div>
            <button type="submit" className="btn btn-accent" style={{ marginTop: 12 }}>
              Save Changes
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
              { title: "Two-Factor Authentication", desc: "Add an extra layer of security to your account.", btn: "Enable" },
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
                {row.toggle !== undefined ? (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      defaultChecked={row.checked}
                      style={{ width: 18, height: 18, accentColor: "var(--green)" }}
                    />{" "}
                    {row.checked ? "Enabled" : "Disabled"}
                  </label>
                ) : (
                  <button className="btn btn-outline btn-sm" type="button">
                    {row.btn}
                  </button>
                )}
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 0",
              }}
            >
              <div>
                <strong>Session Management</strong>
                <br />
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Active sessions: 2 devices.</span>
              </div>
              <button className="btn btn-danger btn-sm" type="button">
                Sign Out All
              </button>
            </div>
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
