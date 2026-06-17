"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type NewsItem } from "@/lib/api";

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContent<NewsItem>("news").then((res) => {
      if (res.data) setArticles(res.data.items);
      setLoading(false);
    });
  }, []);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>News & Announcements</h2>
          <p>Stay informed with the latest updates from the Global Kegite Archaverians Club.</p>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}><span className="loader-dot" /></p>
        ) : (
          <div className="news-grid">
            {articles.map((a) => (
              <Link key={a.id} href={`/news/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <article className="news-card">
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.title} className="news-card-img" style={{ width: "100%", height: 200, objectFit: "cover" }} />
                  ) : (
                    <div className="news-card-img">📰 {a.title.charAt(0)}</div>
                  )}
                  <div className="news-card-body">
                    <span className="news-date">{formatDate(a.created_at)}</span>
                    <h4>{a.title}</h4>
                    <p>{a.body}</p>
                  </div>
                </article>
              </Link>
            ))}
            {articles.length === 0 && <p style={{ textAlign: "center", color: "var(--muted)", gridColumn: "1 / -1" }}>No news articles yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
