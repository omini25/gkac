"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";

interface VerifiedMember {
  name: string;
  category: string;
  membershipCode: string;
  status: "active" | "expired";
  expiresAt: string | null;
}

type Result =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "none"; query: string }
  | { kind: "found"; member: VerifiedMember; query: string }
  | { kind: "error"; message: string };

export default function VerificationPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result>({ kind: "empty" });

  async function doVerify() {
    const query = input.trim().toUpperCase();
    if (!query) {
      setResult({ kind: "empty" });
      return;
    }

    setResult({ kind: "loading" });

    const res = await api.verifyMember(query);
    if (res.data) {
      setResult({ kind: "found", member: res.data.member, query });
    } else {
      setResult({ kind: "none", query });
    }
  }

  const isVisible = result.kind !== "empty" && result.kind !== "loading";
  const isValid = result.kind === "found" && result.member.status === "active";

  return (
    <section className="page-section lg" aria-label="Membership verification">
      <div className="container">
        <div className="section-header">
          <div className="section-divider" />
          <h2>Membership Verification</h2>
          <p style={{ fontSize: "19px", maxWidth: "600px" }}>
            Confirm the membership status of any registered professional — enter
            their membership number below.
          </p>
        </div>
        <div className="verify-box">
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            marginBottom: "var(--space-2)", justifyContent: "center",
          }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "var(--radius-md)",
              background: "var(--green-light)", display: "grid", placeItems: "center",
              fontSize: "18px",
            }}>🔍</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--fg)" }}>Public Lookup</div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>No login required</div>
            </div>
          </div>

          <label htmlFor="verifyInput" style={{
            fontWeight: 600, display: "block", marginBottom: "10px",
            color: "var(--fg)", fontSize: "14px",
          }}>
            Membership Number
          </label>
          <input
            type="text"
            id="verifyInput"
            className="verify-input"
            placeholder="e.g. NC-2024-001234"
            maxLength={30}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doVerify(); }}
          />
          <button
            className="btn btn-accent btn-lg"
            style={{ width: "100%", marginTop: "var(--space-2)" }}
            onClick={doVerify}
            disabled={result.kind === "loading"}
          >
            {result.kind === "loading" ? "Verifying…" : "Verify Status"}
          </button>

          {result.kind === "loading" && (
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "12px" }}>Checking membership register…</p>
              <div style={{
                width: "100%", height: "4px", background: "var(--border)",
                borderRadius: "2px", overflow: "hidden",
              }}>
                <div style={{
                  width: "100%", height: "100%", background: "var(--accent)",
                  borderRadius: "2px", animation: "progressIndeterminate 1.5s ease-in-out infinite",
                }} />
              </div>
            </div>
          )}

          <div className={`verify-result${isVisible ? " visible" : ""}${isVisible ? (isValid ? " valid" : " invalid") : ""}`}>
            {result.kind === "found" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <strong style={{ fontSize: 18 }}>{result.member.name}</strong>
                  <span className={`status-badge ${result.member.status === "active" ? "status-active" : "status-expired"}`}>
                    {result.member.status === "active" ? "Active" : "Expired"}
                  </span>
                </div>
                <div style={{ marginTop: 14, fontSize: 15, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div><strong>Membership No:</strong> {result.member.membershipCode}</div>
                  <div><strong>Category:</strong> {result.member.category}</div>
                  {result.member.expiresAt && (
                    <div><strong>Valid Until:</strong> {new Date(result.member.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  )}
                </div>
              </>
            ) : result.kind === "none" ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <strong style={{ fontSize: 16 }}>No record found for &ldquo;{result.query}&rdquo;.</strong>
                  <span className="status-badge status-not-found">Not Found</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
                  Double-check the membership number and try again, or{" "}
                  <Link href="/contact" style={{ fontWeight: 600 }}>contact us</Link> for assistance.
                </p>
              </>
            ) : null}
          </div>

          <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "var(--space-3)", lineHeight: 1.5 }}>
            This is a public lookup. No login is required. Results are based on the
            GKAC official membership register. For privacy reasons, only name,
            category, and status are displayed.
          </p>
        </div>
      </div>
    </section>
  );
}
