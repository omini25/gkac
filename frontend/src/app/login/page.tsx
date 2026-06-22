"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/useAuth";

function togglePassword(inputId: string, btn: HTMLElement) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "👁" : "🙈";
}

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
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
    const form = e.currentTarget;
    const email = (form.loginEmail as HTMLInputElement).value.trim();
    const password = (form.loginPassword as HTMLInputElement).value;

    const errs: { email?: string; password?: string } = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }
    if (!password) {
      errs.password = "Password is required.";
    }

    setErrors(errs);
    setApiError("");
    if (Object.keys(errs).length > 0) return;

    const res = await login(email, password);
    if (res.error) {
      setApiError(res.error);
      return;
    }

    if (res.user) {
      if (res.user.forcePasswordChange) {
        showToast("Please change your default password to continue.", "warn");
        setTimeout(() => { window.location.href = "/change-password"; }, 1000);
      } else {
        showToast("Signed in successfully. Redirecting to dashboard…", "success");
        setTimeout(() => { window.location.href = res.user!.isAdmin ? "/admin" : "/dashboard"; }, 1000);
      }
    }
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

            <h2>Welcome back to your brotherhood.</h2>
            <p>
              Sign in to access your membership dashboard, manage your profile,
              participate in elections, and stay connected with the global community.
            </p>

            <ul className="auth-feature-list">
              <li>
                <span className="af-icon">📋</span>
                <span>View your digital membership card</span>
              </li>
              <li>
                <span className="af-icon">🗳️</span>
                <span>Participate in chapter elections</span>
              </li>
              <li>
                <span className="af-icon">📚</span>
                <span>Access exclusive member resources</span>
              </li>
              <li>
                <span className="af-icon">📅</span>
                <span>Register for events &amp; conferences</span>
              </li>
            </ul>

            <div className="auth-testimonial">
              <blockquote>
                &ldquo;GKAC has been a cornerstone of my professional journey.
                The network and brotherhood are unparalleled.&rdquo;
              </blockquote>
              <cite>— Adebayo J., Member since 2015</cite>
            </div>
          </div>
        </div>

        {/* Right: Form Panel */}
        <div className="auth-panel-right">
          <div className="auth-form-wrap">
            <div className="auth-brand">
              <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
              <h2>Member Sign In</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {/* Notice banner */}
            <div className="notice-banner">
              <span>🔐</span>
              <span>
                New to the online portal?{" "}
                <Link href="/register" style={{ fontWeight: 700, color: "inherit" }}>Create your account</Link>{" "}
                using your Membership Number or NIN.
              </span>
            </div>

            {apiError && (
              <div className="notice-banner" style={{
                background: "var(--red-bg)", borderColor: "var(--error)", color: "var(--error)",
              }}>
                <span>⚠️</span>
                <span>{apiError}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="loginEmail">Email Address</label>
                <input
                  type="email"
                  id="loginEmail"
                  name="loginEmail"
                  required
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  onChange={() => setErrors((p) => ({ ...p, email: undefined }))}
                />
                <span className={`form-error${errors.email ? " visible" : ""}`}>
                  {errors.email}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <div className="input-icon">
                  <input
                    type="password"
                    id="loginPassword"
                    name="loginPassword"
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    onChange={() => setErrors((p) => ({ ...p, password: undefined }))}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={(e) => togglePassword("loginPassword", e.currentTarget)}
                    aria-label="Toggle password visibility"
                  >
                    👁
                  </button>
                </div>
                <span className={`form-error${errors.password ? " visible" : ""}`}>
                  {errors.password}
                </span>
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "22px",
              }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                  fontSize: "13px", color: "var(--muted)", fontWeight: 500,
                }}>
                  <input
                    type="checkbox"
                    name="remember"
                    style={{ accentColor: "var(--accent)", width: "16px", height: "16px" }}
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  style={{ fontSize: "13px", fontWeight: 600, textDecoration: "none", color: "var(--accent)" }}
                >
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="btn btn-accent" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="auth-footer">
              Don&apos;t have an account?{" "}
              <Link href="/register">Create one now</Link>
            </div>
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

      {/* Toast */}
      {toast && (
        <div className={`toast show ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
