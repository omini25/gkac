"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

function togglePassword(inputId: string, btn: HTMLElement) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "👁" : "🙈";
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  function showToast(msg: string, type = "") {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!token) {
      errs.token = "Missing reset token. Please use the link from your email.";
    }
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = "Password must be at least 8 characters with a number and a letter.";
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setErrors(errs);
    setApiError("");
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const res = await api.resetPassword(token, password);
    setLoading(false);

    if (res.error) {
      setApiError(res.error);
      return;
    }

    setSuccess(true);
    showToast("Password reset successful!", "success");
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />

      {/* ── Split Layout ── */}
      <div className="auth-split">
        {/* Left: Brand Panel */}
        <div className="auth-panel-left">
          <div className="auth-panel-content">
            <Link href="/" style={{ textDecoration: "none", display: "inline-block", marginBottom: "var(--space-4)" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                  <img src="/gkac-logo.png" alt="GKAC" style={{
                    width: "40px", height: "40px", borderRadius: "var(--radius-md)",
                    objectFit: "contain",
                  }} />
                <span style={{ color: "oklch(100% 0 0 / .85)", fontWeight: 700, fontSize: "16px", letterSpacing: "-0.01em" }}>
                  GKAC
                </span>
              </div>
            </Link>

            <h2>Create a strong new password.</h2>
            <p>
              Choose a password you haven&apos;t used before. Use a mix of letters,
              numbers, and symbols for maximum security.
            </p>

            <ul className="auth-feature-list">
              <li>
                <span className="af-icon">🔐</span>
                <span>Minimum 8 characters with letters &amp; numbers</span>
              </li>
              <li>
                <span className="af-icon">🛡️</span>
                <span>Avoid common words or personal info</span>
              </li>
              <li>
                <span className="af-icon">✅</span>
                <span>Use a password manager for best practice</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="auth-panel-right">
          <div className="auth-form-wrap">
            <div className="auth-brand">
              <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
              <h2>Set New Password</h2>
              <p>Choose a secure password for your account</p>
            </div>

            {success ? (
              <div className="auth-success">
                <div className="success-icon">🔐</div>
                <h3>Password Reset Successful</h3>
                <p>
                  Your password has been updated. You can now sign in with your new
                  password.
                </p>
                <Link href="/login" className="btn btn-primary">
                  Sign In
                </Link>
              </div>
            ) : (
              <>
                {apiError && (
                  <div className="notice-banner" style={{
                    background: "var(--red-bg)", borderColor: "var(--error)", color: "var(--error)",
                  }}>
                    <span>⚠️</span><span>{apiError}</span>
                  </div>
                )}

                {errors.token && (
                  <div className="notice-banner" style={{
                    background: "var(--red-bg)", borderColor: "var(--error)", color: "var(--error)",
                  }}>
                    <span>⚠️</span><span>{errors.token}</span>
                  </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="resetPassword">New Password</label>
                    <div className="input-icon">
                      <input type="password" id="resetPassword" required placeholder="Minimum 8 characters" minLength={8} autoComplete="new-password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.password; return n; }); }} />
                      <button type="button" className="toggle-pw" onClick={(e) => togglePassword("resetPassword", e.currentTarget)} aria-label="Toggle">👁</button>
                    </div>
                    <span className={`form-error${errors.password ? " visible" : ""}`}>{errors.password}</span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="resetConfirmPassword">Confirm New Password</label>
                    <input type="password" id="resetConfirmPassword" required placeholder="Re-enter your new password" autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; }); }} />
                    <span className={`form-error${errors.confirmPassword ? " visible" : ""}`}>{errors.confirmPassword}</span>
                  </div>

                  <button type="submit" className="btn btn-accent" disabled={loading}>
                    {loading ? "Resetting…" : "Reset Password"}
                  </button>
                </form>

                <div className="auth-footer">
                  <Link href="/login">← Back to Sign In</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Back link */}
      <div style={{
        position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
        zIndex: 2,
      }}>
        <Link href="/" style={{ fontSize: "13px", color: "var(--muted)", textDecoration: "none" }}>
          ← Back to Public Website
        </Link>
      </div>

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
