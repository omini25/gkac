"use client";

import { useState } from "react";

export default function AboutPage() {
  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>About GKAC</h2>
          <p>Five decades of championing brotherhood, leadership, and community development worldwide.</p>
        </div>
        <div className="about-mission">
          <p>
            <strong>Our mission</strong> is to unite Kegite Archaverians worldwide,
            foster lifelong bonds of brotherhood, develop ethical leaders, and serve
            our communities with dedication and purpose.
          </p>
        </div>

        {/* Values */}
        <div className="values-grid grid-3" style={{ marginTop: "var(--space-5)" }}>
          {[
            { icon: "⚖️", title: "Integrity", desc: "Uncompromising ethical standards in all professional conduct." },
            { icon: "🌟", title: "Excellence", desc: "Continuous pursuit of the highest quality in practice and service." },
            { icon: "🤝", title: "Collaboration", desc: "Building bridges across disciplines, sectors, and communities." },
            { icon: "🌍", title: "Global Service", desc: "Harnessing our collective strength for community development worldwide." },
            { icon: "📚", title: "Lifelong Learning", desc: "Commitment to continuous professional development." },
            { icon: "🔬", title: "Innovation", desc: "Embracing modern tools and approaches to advance the profession." },
          ].map((v) => (
            <div key={v.title} className="value-card">
              <div className="val-icon">{v.icon}</div>
              <h4>{v.title}</h4>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <h3 style={{ textAlign: "center", marginTop: "var(--space-6)" }}>Our History</h3>
        <div className="timeline">
          {[
            { year: "1979", text: <><strong>Founded</strong> — The Global Kegite Archaverians Club was established by a group of visionary Kegites to promote brotherhood and service.</> },
            { year: "1985", text: <><strong>National Recognition</strong> — Granted official recognition and expanded across regions nationwide.</> },
            { year: "1998", text: <><strong>Digital Transformation</strong> — Launched the first digital membership registry and database.</> },
            { year: "2010", text: <><strong>Global Expansion</strong> — Established chapters internationally, bringing Kegites together across borders.</> },
            { year: "2024", text: <><strong>Modernisation</strong> — Launched the new member portal with online verification, digital membership cards, and enhanced services.</> },
          ].map((item) => (
            <div key={item.year} className="timeline-item">
              <span className="timeline-year">{item.year}</span>
              <div>{item.text}</div>
            </div>
          ))}
        </div>

        {/* Past Exco Gallery */}
        <h3 style={{ textAlign: "center", marginTop: "var(--space-6)" }}>Past Executive Committees</h3>
        <p style={{ textAlign: "center", color: "var(--muted)", maxWidth: 600, margin: "0 auto var(--space-4)" }}>
          A look back at the dedicated leaders who have served our club over the years.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {[
            { year: "2018", label: "2018 Exco" },
            { year: "2020", label: "2020 Exco" },
            { year: "2022", label: "2022 Exco" },
            { year: "2024", label: "2024 Exco" },
          ].map((exco) => (
            <ExcoCard key={exco.year} exco={exco} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Exco Gallery Card ─────────────────────────────────────────────────────
function ExcoCard({ exco }: { exco: { year: string; label: string } }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        padding: 0,
        textAlign: "center",
      }}
    >
      <div
        style={{
          height: 220,
          background: imgError
            ? `linear-gradient(135deg, var(--green-dark), var(--green))`
            : undefined,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {imgError ? (
          <span style={{ fontSize: 52, fontWeight: 800, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.03em" }}>
            {exco.year}
          </span>
        ) : (
          <img
            src={`/exco/${exco.year}.jpg`}
            alt={exco.label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              top: 0,
              left: 0,
            }}
            onError={() => setImgError(true)}
          />
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
            padding: "40px 16px 12px",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              textShadow: "0 1px 4px rgba(0,0,0,.3)",
            }}
          >
            {exco.label}
          </span>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: 0 }}>
          Past Exco — {exco.year}
        </p>
      </div>
    </div>
  );
}
