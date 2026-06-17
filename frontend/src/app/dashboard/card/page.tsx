"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import NextImage from "next/image";
import jsPDF from "jspdf";
import { useAuth, getExpiryInfo } from "@/lib/useAuth";

const VERIFY_BASE = "https://gkacglobal.org/verify";

// ── Card colours (hard-coded so canvas rendering is reliable) ──────────────
const CARD_W = 420;
const CARD_H = Math.round(CARD_W / 1.586);
const GRAD_TOP = "#1a5632";
const GRAD_BOT = "#2d8a4e";
const ACCENT_CIRCLE = "rgba(255,255,255,0.08)";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/** Polyfill roundRect for older browsers. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/** Render the membership card onto a canvas at the given scale. */
function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  fullName: string,
  category: string,
  memberCode: string,
  validUntil: string,
  scale: number,
  logoImg: HTMLImageElement | null,
) {
  const w = CARD_W * scale;
  const h = CARD_H * scale;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const s = scale;

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, GRAD_TOP);
  grad.addColorStop(1, GRAD_BOT);
  ctx.fillStyle = grad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, w, h, 14 * s);
  ctx.fill();

  // Decorative circle (top-right)
  ctx.beginPath();
  ctx.arc(w + 40 * s, -40 * s, 160 * s / 2, 0, Math.PI * 2);
  ctx.strokeStyle = ACCENT_CIRCLE;
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // ── Logo image ────────────────────────────────────────────
  let logoRight = 24 * s;
  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const logoH = 32 * s;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    ctx.save();
    // Circular clip for the logo
    ctx.beginPath();
    ctx.arc(24 * s + logoW / 2, 24 * s + logoH / 2, logoH / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(logoImg, 24 * s, 24 * s, logoW, logoH);
    ctx.restore();
    logoRight = 24 * s + logoW + 12 * s;
  }

  // Organisation name beside the logo
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.8;
  ctx.font = `bold ${13 * s}px -apple-system, "SF Pro Display", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("GLOBAL KEGITE ARCHAVERIANS CLUB", logoRight, 24 * s + 16 * s);
  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";

  // ── Vertical start position for fields ────────────────────
  const topY = logoImg && logoImg.complete ? 24 * s + 32 * s + 12 * s : 24 * s + 14 * s + 12 * s;

  // Name
  ctx.font = `bold ${18 * s}px -apple-system, "SF Pro Display", system-ui, sans-serif`;
  ctx.fillText(fullName, 24 * s, topY + 18 * s);

  // Category
  ctx.globalAlpha = 0.7;
  ctx.font = `600 ${12 * s}px -apple-system, "SF Pro Text", system-ui, sans-serif`;
  ctx.fillText(category.toUpperCase(), 24 * s, topY + 18 * s + 4 * s + 12 * s);
  ctx.globalAlpha = 1;

  // Member code
  ctx.globalAlpha = 0.65;
  ctx.font = `${13 * s}px "SF Mono", ui-monospace, monospace`;
  ctx.fillText(memberCode, 24 * s, topY + 18 * s + 4 * s + 12 * s + 16 * s + 13 * s);
  ctx.globalAlpha = 1;

  // Valid until
  ctx.globalAlpha = 0.55;
  ctx.font = `${11 * s}px -apple-system, "SF Pro Text", system-ui, sans-serif`;
  ctx.fillText(`Valid until ${validUntil}`, 24 * s, topY + 18 * s + 4 * s + 12 * s + 16 * s + 13 * s + 8 * s + 11 * s);
  ctx.globalAlpha = 1;
}

export default function MembershipCardPage() {
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Preload the GKAC logo for canvas rendering
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoImg(img);
    img.onerror = () => console.warn("Failed to load logo for card export");
    img.src = "/gkac-logo.png";
  }, []);

  const expiry = user ? getExpiryInfo(user.membershipExpiresAt) : { days: 0, expired: false };
  const fullName = user ? `${user.firstName} ${user.lastName}` : "—";
  const memberCode = user?.membershipCode || "—";
  const category = user?.membershipCategory || "—";
  const validUntil = user?.membershipExpiresAt ? formatDate(user.membershipExpiresAt) : "—";
  const isActive = !expiry.expired && user?.applicationStatus === "approved";
  const verifyUrl = `${VERIFY_BASE}?code=${encodeURIComponent(memberCode)}`;

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

  const getCardCanvas = useCallback(
    (scale: number): HTMLCanvasElement => {
      const c = document.createElement("canvas");
      renderCardToCanvas(c, fullName, category, memberCode, validUntil, scale, logoImg);
      return c;
    },
    [fullName, category, memberCode, validUntil, logoImg],
  );

  function handleDownloadPNG() {
    setBusy("png");
    try {
      const canvas = getCardCanvas(3);
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast("Failed to generate PNG.");
          setBusy(null);
          return;
        }
        triggerDownload(blob, `gkac-membership-card-${memberCode}.png`);
        showToast("PNG downloaded successfully.");
        setBusy(null);
      }, "image/png");
    } catch (err) {
      console.error("PNG error:", err);
      showToast("Failed to generate PNG.");
      setBusy(null);
    }
  }

  function handleDownloadPDF() {
    setBusy("pdf");
    try {
      const canvas = getCardCanvas(3);
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
      {/* Digital Card (DOM version for display) */}
      <div ref={cardRef}>
        <div className="member-card">
          <div className="mc-logo">
            <NextImage
              src="/gkac-logo.png"
              alt="GKAC"
              width={32}
              height={32}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            <span>GLOBAL KEGITE ARCHAVERIANS CLUB</span>
          </div>
          <div className="mc-name">{fullName}</div>
          <div className="mc-cat">{category}</div>
          <div className="mc-id">{memberCode}</div>
          <div className="mc-valid">Valid until {validUntil}</div>
        </div>
      </div>

      {/* Hidden canvas used for download exports */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

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
            <strong>gkacglobal.org/verify</strong> using your Membership Number.
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
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 300,
            background: "var(--green-dark)",
            color: "#fff",
            padding: "14px 22px",
            borderRadius: "var(--radius-md)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "var(--shadow-lg)",
            whiteSpace: "pre-line",
            maxWidth: 360,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
