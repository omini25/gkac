"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type NewsItem } from "@/lib/api";

export default function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContent<NewsItem>("news").then((res) => {
      if (res.data) setAnnouncements(res.data.items.slice(0, 6));
      setLoading(false);
    });
  }, []);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }

  return (
    <section className="page-section" aria-label="Announcements" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="container">
        <div className="section-header">
          <div className="section-divider" />
          <h2>Announcements</h2>
          <p style={{ fontSize: "19px" }}>
            Important updates from the Global Headquarters.
          </p>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0" }}><span className="loader-dot" /></p>
        ) : announcements.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "20px 0" }}>No announcements yet.</p>
        ) : (
          <div className="updates-grid">
            {announcements.map((a, i) => (
              <Link key={a.id} href={`/news/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  className="update-card"
                  style={{
                    borderLeft: i === 0 ? "4px solid var(--accent)" : i === 1 ? "4px solid var(--warn)" : "4px solid var(--border)",
                    cursor: "pointer",
                    transition: "box-shadow .2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div className="update-date">{formatDate(a.published_at || a.created_at)}</div>
                  <h4>{a.title}</h4>
                  <p>{a.body.length > 150 ? a.body.slice(0, 150) + "…" : a.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: "var(--space-3)" }}>
          <Link href="/news" className="btn btn-outline">
            View All Announcements &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
