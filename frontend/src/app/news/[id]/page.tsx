"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type NewsItem } from "@/lib/api";

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getContentItem<NewsItem>("news", id).then((res) => {
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setArticle(res.data.item);
      }
      setLoading(false);
    });
  }, [id]);

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="page-section">
        <div className="container" style={{ textAlign: "center", padding: "80px 0" }}>
          <span className="loader-dot" />
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="page-section">
        <div className="container" style={{ textAlign: "center", padding: "80px 0" }}>
          <h2>Not Found</h2>
          <p style={{ color: "var(--muted)", marginTop: 16 }}>
            {error === "Not found."
              ? "This news article could not be found. It may have been removed or is not yet published."
              : "Failed to load this article."}
          </p>
          <Link href="/news" className="btn btn-outline" style={{ marginTop: 24 }}>
            ← Back to News
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-section">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link
          href="/news"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--accent)",
            textDecoration: "none",
            fontWeight: 600,
            marginBottom: 24,
            fontSize: 16,
          }}
        >
          ← Back to News
        </Link>

        {article.image_url && (
          <img
            src={article.image_url}
            alt={article.title}
            style={{
              width: "100%",
              maxHeight: 420,
              objectFit: "cover",
              borderRadius: "var(--radius-lg)",
              marginBottom: 24,
            }}
          />
        )}

        <div style={{ marginBottom: 8 }}>
          <span className="news-date">{formatDate(article.published_at || article.created_at)}</span>
        </div>

        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", marginBottom: 24 }}>
          {article.title}
        </h1>

        <div
          style={{
            fontSize: 18,
            lineHeight: 1.75,
            color: "var(--fg)",
            whiteSpace: "pre-wrap",
          }}
        >
          {article.body}
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
          }}
        >
          <Link href="/news" className="btn btn-outline">
            ← Back to News
          </Link>
        </div>
      </div>
    </div>
  );
}
