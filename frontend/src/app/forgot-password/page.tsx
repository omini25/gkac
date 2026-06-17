"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  function showToast(msg: string, type = "") {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const val = email.trim();
    if (!val || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setApiError("");
    setLoading(true);
    const res = await api.forgotPassword(val);
    setLoading(false);
    if (res.error) {
      setApiError(res.error);
      return;
    }
    setSent(true);
    showToast("Reset link sent. Check your email.", "success");
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

            <h2>Reset your password, stay connected.</h2>
            <p>
              We&apos;ll send a secure reset link to your registered email address.
              The link expires in 1 hour for your security.
            </p>

            <ul className="auth-feature-list">
              <li>
                <span className="af-icon">🔒</span>
                <span>Secure, encrypted reset process</span>
              </li>
              <li>
                <span className="af-icon">⏱️</span>
                <span>Link expires after 1 hour</span>
              </li>
              <li>
                <span className="af-icon">📧</span>
                <span>Check spam if you don&apos;t see it</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="auth-panel-right">
          <div className="auth-form-wrap">
            <div className="auth-brand">
              <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
              <h2>Forgot Password</h2>
              <p>We&apos;ll help you get back into your account</p>
            </div>

            {sent ? (
              <div className="auth-success">
                <div className="success-icon">✉️</div>
                <h3>Check Your Email</h3>
                <p>
                  If an account exists for <strong>{email}</strong>, you&apos;ll
                  receive a password reset link within a few minutes.
                </p>
                <div className="success-card">
                  <strong>Didn&apos;t receive it?</strong>
                  <ul>
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>
                      <button
                        type="button"
                        onClick={() => setSent(false)}
                        style={{
                          background: "none", border: 0, cursor: "pointer",
                          fontFamily: "var(--font-body)", fontSize: "13px",
                          color: "var(--accent)", fontWeight: 600,
                          textDecoration: "underline", padding: 0,
                        }}
                      >
                        Try again with a different email
                      </button>
                    </li>
                  </ul>
                </div>
                <Link href="/login" className="btn btn-primary">
                  Back to Sign In
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

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                  <div className="form-group">
                    <label htmlFor="forgotEmail">Email Address</label>
                    <input
                      type="email"
                      id="forgotEmail"
                      required
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); setApiError(""); }}
                    />
                    <span className={`form-error${error ? " visible" : ""}`}>{error}</span>
                  </div>
                  <button type="submit" className="btn btn-accent" disabled={loading}>
                    {loading ? "Sending…" : "Send Reset Link"}
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
