"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PosterCarouselProps {
  images: string[];
  folder: string;
  title: string;
  description: string;
  /** Auto-rotation interval in milliseconds (default: 4000) */
  intervalMs?: number;
}

export default function PosterCarousel({
  images,
  folder,
  title,
  description,
  intervalMs = 4000,
}: PosterCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const len = images.length;

  // ── Resolve image source ──────────────────────────────────────────────────
  function getSrc(filename: string): string {
    if (
      filename.startsWith("http://") ||
      filename.startsWith("https://") ||
      filename.startsWith("/api/")
    ) {
      return filename;
    }
    return `/${folder}/${encodeURIComponent(filename)}`;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % len);
  }, [len]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + len) % len);
  }, [len]);

  const goTo = (idx: number) => setCurrent(idx);

  // ── Lightbox ──────────────────────────────────────────────────────────────
  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setIsPaused(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIdx(null);
    setIsPaused(false);
  }, []);

  const lbNext = useCallback(() => {
    setLightboxIdx((prev) => (prev !== null ? (prev + 1) % len : null));
  }, [len]);

  const lbPrev = useCallback(() => {
    setLightboxIdx((prev) => (prev !== null ? (prev - 1 + len) % len : null));
  }, [len]);

  // ── Auto-rotation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || len <= 1) return;
    timerRef.current = setInterval(goNext, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, len, intervalMs, goNext]);

  // ── Keyboard navigation for lightbox ──────────────────────────────────────
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") lbNext();
      else if (e.key === "ArrowLeft") lbPrev();
      else if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, lbNext, lbPrev, closeLightbox]);

  if (len === 0) return null;

  return (
    <>
      <div className="section-header" style={{ marginTop: "var(--space-5)" }}>
        <div className="section-divider" />
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div
        className="poster-carousel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 800,
          margin: "0 auto var(--space-4)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          background: "var(--surface)",
          aspectRatio: "16 / 10",
        }}
      >
        {/* ── Slides ─────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            transition: "transform 0.5s ease-in-out",
            height: "100%",
            transform: `translateX(-${current * 100}%)`,
          }}
        >
          {images.map((filename, idx) => (
            <div
              key={idx}
              style={{
                minWidth: "100%",
                height: "100%",
                position: "relative",
                flexShrink: 0,
                cursor: "pointer",
              }}
              onClick={() => openLightbox(idx)}
            >
              <img
                src={getSrc(filename)}
                alt={`${title} ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* Click to expand overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0)",
                  transition: "background 0.3s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="carousel-expand-overlay"
              >
                <span
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.6)",
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    opacity: 0,
                    transition: "opacity 0.3s",
                    pointerEvents: "none",
                  }}
                  className="carousel-expand-hint"
                >
                  ⛶ Click to expand
                </span>
              </div>
              {/* Image counter badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 12,
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                }}
              >
                {idx + 1} / {len}
              </div>
            </div>
          ))}
        </div>

        {/* ── Left arrow ────────────────────────────────────── */}
        {len > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="carousel-arrow carousel-arrow-left"
            aria-label="Previous"
          >
            ‹
          </button>
        )}

        {/* ── Right arrow ───────────────────────────────────── */}
        {len > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="carousel-arrow carousel-arrow-right"
            aria-label="Next"
          >
            ›
          </button>
        )}

        {/* ── Dots ──────────────────────────────────────────── */}
        {len > 1 && (
          <div
            className="carousel-dots"
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 8,
            }}
          >
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: idx === current ? "var(--accent)" : "rgba(255,255,255,0.5)",
                  transition: "background 0.3s",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* ── Pause indicator ───────────────────────────────── */}
        {isPaused && lightboxIdx === null && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
            }}
          >
            ❚❚ Paused
          </div>
        )}
      </div>

      {/* ═══ LIGHTBOX ═══ */}
      {lightboxIdx !== null && (
        <div
          className="modal-overlay open"
          onClick={closeLightbox}
          style={{
            background: "rgba(0,0,0,0.9)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "95vw",
              maxHeight: "95vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: "absolute",
                top: -44,
                right: 0,
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: 28,
                cursor: "pointer",
                lineHeight: 1,
                zIndex: 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Previous */}
            {len > 1 && (
              <button
                onClick={lbPrev}
                className="lightbox-arrow lightbox-arrow-left"
                aria-label="Previous"
              >
                ‹
              </button>
            )}

            {/* Next */}
            {len > 1 && (
              <button
                onClick={lbNext}
                className="lightbox-arrow lightbox-arrow-right"
                aria-label="Next"
              >
                ›
              </button>
            )}

            {/* Image */}
            <img
              src={getSrc(images[lightboxIdx])}
              alt={`${title} ${lightboxIdx + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: "85vh",
                borderRadius: "var(--radius-md)",
                objectFit: "contain",
              }}
            />

            {/* Caption */}
            <div
              style={{
                marginTop: 12,
                color: "rgba(255,255,255,0.7)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {lightboxIdx + 1} / {len}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
