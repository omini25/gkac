"use client";

import { useState, useCallback, useEffect } from "react";

interface ImageGalleryProps {
  images: string[];
  folder: string;
  title: string;
  description: string;
}

export default function ImageGallery({ images, folder, title, description }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (idx: number) => setLightboxIndex(idx);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goNext = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev + 1) % images.length : null));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev !== null ? (prev - 1 + images.length) % images.length : null));
  }, [images.length]);

  const currentImage = lightboxIndex !== null ? `/${folder}/${encodeURIComponent(images[lightboxIndex])}` : null;
  const currentFilename = lightboxIndex !== null ? images[lightboxIndex] : null;

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goNext, goPrev, closeLightbox]);

  return (
    <>
      <div className="section-header" style={{ marginTop: "var(--space-5)" }}>
        <div className="section-divider" />
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "var(--space-2)",
        marginBottom: "var(--space-4)",
      }}>
        {images.map((filename, idx) => {
          const src = `/${folder}/${encodeURIComponent(filename)}`;
          return (
            <div
              key={filename}
              onClick={() => openLightbox(idx)}
              style={{
                position: "relative",
                cursor: "pointer",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                aspectRatio: "4 / 3",
                border: "2px solid var(--border)",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <img
                src={src}
                alt={`${title} image ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                padding: "8px",
                color: "#fff",
                fontSize: 12,
                textAlign: "center",
              }}>
                Click to view
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ LIGHTBOX MODAL ═══ */}
      {lightboxIndex !== null && currentImage && (
        <div
          className="modal-overlay open"
          onClick={closeLightbox}
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 9999 }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              style={{
                position: "absolute",
                top: -40, right: 0,
                background: "none", border: "none",
                color: "#fff", fontSize: 28,
                cursor: "pointer", zIndex: 1,
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Previous arrow */}
            <button
              onClick={goPrev}
              style={{
                position: "absolute", left: -50, top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none",
                color: "#fff", fontSize: 32, cursor: "pointer",
                borderRadius: "50%", width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              aria-label="Previous image"
            >
              ‹
            </button>

            {/* Next arrow */}
            <button
              onClick={goNext}
              style={{
                position: "absolute", right: -50, top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.15)", border: "none",
                color: "#fff", fontSize: 32, cursor: "pointer",
                borderRadius: "50%", width: 44, height: 44,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
              aria-label="Next image"
            >
              ›
            </button>

            {/* Image */}
            <img
              src={currentImage}
              alt={`${title} image ${lightboxIndex + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "var(--radius-md)",
                objectFit: "contain",
              }}
            />

            {/* Caption bar */}
            <div style={{
              marginTop: 12,
              display: "flex",
              gap: 16,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <span style={{ color: "#ccc", fontSize: 14 }}>
                {lightboxIndex + 1} / {images.length}
              </span>
              <a
                href={currentImage}
                download={currentFilename || "image"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 20px",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ⬇ Download
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
