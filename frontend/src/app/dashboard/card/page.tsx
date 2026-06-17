"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import NextImage from "next/image";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { useAuth, getExpiryInfo } from "@/lib/useAuth";

const VERIFY_BASE = "https://gkaclub.org/verification";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function MembershipCardPage() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const expiry = user ? getExpiryInfo(user.membershipExpiresAt) : { days: 0, expired: false };
  const fullName = user ? `${user.firstName} ${user.lastName}` : "—";
  const memberCode = user?.membershipCode || "—";
  const category = user?.membershipCategory || "—";
  const validUntil = user?.membershipExpiresAt ? formatDate(user.membershipExpiresAt) : "—";
  const issueDate = user?.createdAt ? formatDate(user.createdAt) : "—";
  const photoUrl = user?.passportPhotoUrl || null;
  const initials = user ? getInitials(user.firstName, user.lastName) : "??";
  const isActive = !expiry.expired && user?.applicationStatus === "approved";
  const verifyUrl = `${VERIFY_BASE}?code=${encodeURIComponent(memberCode)}`;

  // Generate QR code
  useEffect(() => {
    QRCode.toDataURL(verifyUrl, { width: 120, margin: 1, color: { dark: "#0a3d2e", light: "#ffffff" } })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [verifyUrl]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /** Inject a <style> override that replaces all oklch() CSS variables
   *  with hex equivalents so html2canvas won't choke. */
  function patchColorsForCapture(cardEl: HTMLElement): HTMLStyleElement {
    const style = document.createElement("style");
    style.id = "mc-cap-fix";
    style.textContent = `
      :root {
        --bg: #f5f3f0;
        --surface: #ffffff;
        --fg: #2d281c;
        --muted: #6b6455;
        --border: #e0dbd2;
        --border-strong: #c5beb0;
        --green: #0a7a4a;
        --green-dark: #0a5c38;
        --green-light: #e2f0e2;
        --tan: #b8a88a;
        --tan-dark: #8a7a5e;
        --tan-light: #e6e0d5;
        --success: #1a8a5a;
        --warn: #b89820;
        --error: #c04030;
      }
    `;
    cardEl.appendChild(style);
    return style;
  }

  async function handleDownloadPNG() {
    setBusy("png");
    try {
      const { default: html2canvas } = await import("html2canvas");
      if (!cardRef.current) { showToast("Could not find card element."); setBusy(null); return; }
      const fixStyle = patchColorsForCapture(cardRef.current);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        onclone(clonedDoc) {
          // belt-and-suspenders: strip any oklch that leaked through
          clonedDoc.querySelectorAll("style").forEach((el) => {
            el.textContent = (el.textContent || "").replace(/oklch\([^)]+\)/g, "#000");
          });
          clonedDoc.querySelectorAll("[style]").forEach((el) => {
            el.setAttribute("style",
              (el.getAttribute("style") || "").replace(/oklch\([^)]+\)/g, "#000"));
          });
        },
      });
      fixStyle.remove();
      canvas.toBlob((blob) => {
        if (!blob) { showToast("Failed to generate PNG."); setBusy(null); return; }
        triggerDownload(blob, `gkac-membership-card-${memberCode}.png`);
        showToast("PNG downloaded successfully.");
        setBusy(null);
      }, "image/png");
    } catch (err) {
      document.getElementById("mc-cap-fix")?.remove();
      console.error("PNG error:", err);
      showToast("Failed to generate PNG.");
      setBusy(null);
    }
  }

  async function handleDownloadPDF() {
    setBusy("pdf");
    try {
      const { default: html2canvas } = await import("html2canvas");
      if (!cardRef.current) { showToast("Could not find card element."); setBusy(null); return; }
      const fixStyle = patchColorsForCapture(cardRef.current);
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        onclone(clonedDoc) {
          clonedDoc.querySelectorAll("style").forEach((el) => {
            el.textContent = (el.textContent || "").replace(/oklch\([^)]+\)/g, "#000");
          });
          clonedDoc.querySelectorAll("[style]").forEach((el) => {
            el.setAttribute("style",
              (el.getAttribute("style") || "").replace(/oklch\([^)]+\)/g, "#000"));
          });
        },
      });
      fixStyle.remove();
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 3, canvas.height / 3],
      });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pw, ph);
      pdf.save(`gkac-membership-card-${memberCode}.pdf`);
      showToast("PDF downloaded successfully.");
    } catch (err) {
      document.getElementById("mc-cap-fix")?.remove();
      console.error("PDF error:", err);
      showToast("Failed to generate PDF.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    try {
      if (navigator.share && navigator.canShare({ url: verifyUrl })) {
        await navigator.share({
          title: "GKAC Membership Card",
          text: `Verify ${fullName}'s GKAC membership:`,
          url: verifyUrl,
        });
      } else {
        await navigator.clipboard.writeText(verifyUrl);
        showToast("Verification link copied to clipboard!");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(verifyUrl);
          showToast("Verification link copied to clipboard!");
        } catch {
          showToast("Could not share. Copy this link manually:\n" + verifyUrl);
        }
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card-page-grid">
      {/* Digital Card */}
      <div ref={cardRef}>
        <div className="member-card">
          {/* Header: Logo + Org name */}
          <div className="mc-header">
            <NextImage
              src="/gkac-logo.png"
              alt="GKAC"
              width={34}
              height={34}
              className="mc-header-logo"
            />
            <span className="mc-header-text">Global Kegite<br />Archaverians Club</span>
          </div>

          {/* Title */}
          <div className="mc-title">Membership Card</div>
          <div className="mc-divider" />

          {/* Body: Photo + Details + QR */}
          <div className="mc-body">
            {/* Photo */}
            <div className="mc-photo-wrap">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="mc-photo"
                />
              ) : (
                <div className="mc-photo-placeholder">{initials}</div>
              )}
            </div>

            {/* Details */}
            <div className="mc-details">
              <div className="mc-detail-row">
                <div className="mc-detail-label">Name</div>
                <div className="mc-detail-value mc-name-val">{fullName}</div>
              </div>
              <div className="mc-detail-row">
                <div className="mc-detail-label">Member ID</div>
                <div className="mc-detail-value mc-mono">{memberCode}</div>
              </div>
              <div className="mc-detail-row">
                <div className="mc-detail-label">Type</div>
                <div className="mc-detail-value">{category}</div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div className="mc-detail-row" style={{ marginBottom: 0 }}>
                  <div className="mc-detail-label">Issued</div>
                  <div className="mc-detail-value" style={{ fontSize: 11 }}>{issueDate}</div>
                </div>
                <div className="mc-detail-row" style={{ marginBottom: 0 }}>
                  <div className="mc-detail-label">Expires</div>
                  <div className="mc-detail-value" style={{ fontSize: 11 }}>{validUntil}</div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="mc-qr">
                <img src={qrDataUrl} alt="QR" style={{ width: "100%", height: "100%" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for qr reference */}
      <canvas ref={qrCanvasRef} style={{ display: "none" }} />

      {/* Actions & Verification */}
      <div>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Membership Card</h3>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20 }}>
            Your digital membership card is valid for nationwide verification. Download it for
            offline use or share it directly.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="btn btn-accent"
              style={{ width: "100%" }}
              type="button"
              onClick={handleDownloadPNG}
              disabled={busy === "png"}
            >
              {busy === "png" ? "⏳ Generating…" : "📥 Download Card (PNG)"}
            </button>
            <button
              className="btn btn-outline"
              style={{ width: "100%" }}
              type="button"
              onClick={handleDownloadPDF}
              disabled={busy === "pdf"}
            >
              {busy === "pdf" ? "⏳ Generating…" : "📄 Download Card (PDF)"}
            </button>
            <button
              className="btn btn-outline"
              style={{ width: "100%" }}
              type="button"
              onClick={handleShare}
              disabled={busy === "share"}
            >
              {busy === "share" ? "⏳ Sharing…" : "🔗 Share Verification Link"}
            </button>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Verification Status</h3>
          <span className={`status-badge ${isActive ? "status-active" : "status-expired"}`} style={{ marginBottom: 12 }}>
            ● {isActive ? "Active &amp; Verifiable" : expiry.expired ? "Expired" : user?.applicationStatus === "pending_approval" ? "Pending Approval" : "Inactive"}
          </span>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Anyone can verify your membership at{" "}
            <strong>gkaclub.org/verification</strong> using your Membership Number.
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            Direct link:{" "}
            <a href={verifyUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: "break-all" }}>
              {verifyUrl}
            </a>
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 300,
            background: "var(--green-dark)", color: "#fff",
            padding: "14px 22px", borderRadius: "var(--radius-md)",
            fontSize: 14, fontWeight: 600, boxShadow: "var(--shadow-lg)",
            whiteSpace: "pre-line", maxWidth: 360,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
