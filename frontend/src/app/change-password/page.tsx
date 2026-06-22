"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { api } from "@/lib/api";
import Link from "next/link";

export default function ChangePasswordPage() {
  const { user, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="auth-page">
        <div className="container" style={{ textAlign: "center", paddingTop: "var(--space-8)" }}>
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="container" style={{ textAlign: "center", paddingTop: "var(--space-8)" }}>
          <p>Please sign in first.</p>
          <Link href="/login" className="btn btn-accent" style={{ marginTop: "var(--space-2)" }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must be at least 8 characters with a number and a letter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSubmitting(true);
    const res = await api.changePassword(currentPassword, newPassword);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSuccess("Password changed successfully! Redirecting to dashboard…");
    setTimeout(() => {
      window.location.href = user.isAdmin ? "/admin" : "/dashboard";
    }, 1500);
  }

  return (
    <div className="auth-page">
      <div className="container" style={{ maxWidth: 480, margin: "0 auto", paddingTop: "var(--space-8)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-5)" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--green-light)", display: "inline-flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 28, marginBottom: "var(--space-2)",
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: "28px", marginBottom: "var(--space-1)" }}>Change Your Password</h2>
          <p style={{ color: "var(--muted)", fontSize: "16px" }}>
            For security, you are required to change your default password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password" id="currentPassword" value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your default password"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password" id="newPassword" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters with a number and letter"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password" id="confirmPassword" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              required
            />
          </div>

          {error && (
            <div className="form-error visible" style={{ marginBottom: 0 }}>
              {error}
            </div>
          )}
          {success && (
            <div className="form-success visible" style={{ marginBottom: 0 }}>
              ✓ {success}
            </div>
          )}

          <button type="submit" className="btn btn-accent btn-lg" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Changing Password…" : "Change Password"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "var(--space-3)", fontSize: "14px", color: "var(--muted)" }}>
          Need help? <Link href="/contact">Contact support</Link>
        </p>
      </div>
    </div>
  );
}
