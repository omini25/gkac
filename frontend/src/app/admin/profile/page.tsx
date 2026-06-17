"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Profile form
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  async function handleSaveProfile() {
    setProfileSaving(true);
    const res = await api.updateProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
    });
    setProfileSaving(false);
    if (res.error) {
      showToast(res.error, "error");
      return;
    }
    // Update stored user data
    if (res.data?.profile && user) {
      const updated = {
        ...user,
        firstName: res.data.profile.firstName,
        lastName: res.data.profile.lastName,
        email: res.data.profile.email,
        phone: res.data.profile.phone,
      };
      localStorage.setItem("gkac_user", JSON.stringify(updated));
      // Force re-render by dispatching a storage event
      window.dispatchEvent(new Event("storage"));
    }
    showToast(res.data?.message || "Profile updated.", "success");
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }
    setPasswordSaving(true);
    const res = await api.changePassword(currentPassword, newPassword);
    setPasswordSaving(false);
    if (res.error) {
      showToast(res.error, "error");
      return;
    }
    showToast(res.data?.message || "Password changed.", "success");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  if (!user) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading profile…</div>;
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Profile Info */}
        <div className="card">
          <div className="card-header">
            <h3>Profile Information</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>First Name</label>
                <input
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Last Name</label>
                <input
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <hr style={{ borderColor: "var(--border)", margin: "8px 0" }} />

            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><strong>Category:</strong> {user.membershipCategory || "—"}</div>
                <div><strong>Code:</strong> {user.membershipCode || "—"}</div>
                <div><strong>Status:</strong> {user.applicationStatus || "—"}</div>
                <div><strong>Verified:</strong> {user.isVerified ? "Yes" : "No"}</div>
                <div><strong>Role:</strong> {user.isAdmin ? "Admin" : "Member"}</div>
                <div><strong>Expires:</strong> {user.membershipExpiresAt ? new Date(user.membershipExpiresAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
              </div>
            </div>

            <button
              className="btn btn-accent"
              style={{ width: "100%" }}
              disabled={profileSaving}
              onClick={handleSaveProfile}
            >
              {profileSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <h3>Change Password</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with a number and a letter"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <button
              className="btn btn-accent"
              style={{ width: "100%" }}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
              onClick={handleChangePassword}
            >
              {passwordSaving ? "Changing…" : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
