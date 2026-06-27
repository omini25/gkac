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

  // ── Auto-rotation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || len <= 1) return;
    timerRef.current = setInterval(goNext, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, len, intervalMs, goNext]);

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
              }}
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
        {isPaused && (
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
    </>
  );
}
