"use client";

import { useState, useEffect, useMemo } from "react";
import { api, type Resource } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "cpd", label: "CPD Materials" },
  { value: "policy", label: "Policy Documents" },
  { value: "forms", label: "Forms & Templates" },
  { value: "reports", label: "Annual Reports" },
  { value: "guides", label: "Guides & Handbooks" },
  { value: "general", label: "General" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter((c) => c.value !== "all").map((c) => [c.value, c.label])
);

/** Map mime types to icon emoji */
function fileIcon(mime: string): string {
  if (mime.includes("pdf")) return "📄";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("spreadsheet")) return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint") || mime.includes("slides")) return "📽️";
  if (mime.includes("image")) return "🖼️";
  if (mime.includes("video")) return "🎬";
  if (mime.includes("audio")) return "🎧";
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar") || mime.includes("gz")) return "🗜️";
  return "📁";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    api.getResources().then((res) => {
      if (res.data) setResources(res.data.resources);
      setLoading(false);
    });
  }, []);

  async function handleDownload(resource: Resource) {
    setDownloading(resource.id);
    try {
      const token = localStorage.getItem("gkac_token");
      const res_ = await fetch(`${API_BASE}/resources/${resource.id}/download`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res_.ok) throw new Error("Download failed");
      const blob = await res_.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.original_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloading(null);
    }
  }

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchSearch = !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.description || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = filter === "all" || r.category === filter;
      return matchSearch && matchCat;
    });
  }, [resources, search, filter]);

  return (
    <div className="card">
      <div className="resource-header-bar">
        <h3 style={{ margin: 0 }}>Resources &amp; Documents</h3>
        <span className="resource-count">
          {filtered.length === resources.length
            ? `${resources.length} file${resources.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${resources.length} file${resources.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Search */}
      <div className="resource-search-row" style={{ marginBottom: 14 }}>
        <input
          type="text"
          placeholder="Search by title or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filter pills */}
      <div className="resource-filters">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={`resource-filter-btn${filter === c.value ? " active" : ""}`}
            onClick={() => setFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <span className="loader-dot" />
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 14 }}>Loading resources…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="resource-empty">
          <div className="resource-empty-icon">
            {search || filter !== "all" ? "🔍" : "📂"}
          </div>
          <h4>{search || filter !== "all" ? "No matches found" : "No resources yet"}</h4>
          <p>
            {search || filter !== "all"
              ? "Try adjusting your search or filter to find what you're looking for."
              : "Resources and documents will appear here once they've been uploaded."}
          </p>
          {(search || filter !== "all") && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => { setSearch(""); setFilter("all"); }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="resource-grid">
          {filtered.map((r) => (
            <div key={r.id} className="resource-card">
              <div className="resource-card-icon">{fileIcon(r.mime_type)}</div>
              <div className="resource-card-body">
                <h4>{r.title}</h4>
                {r.description && <div className="resource-desc">{r.description}</div>}
                <div className="resource-card-meta">
                  <span>
                    {CATEGORY_LABELS[r.category] || r.category}
                  </span>
                  <span>·</span>
                  <span>{formatSize(r.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(r.created_at)}</span>
                  {r.download_count > 0 && (
                    <>
                      <span>·</span>
                      <span>⬇️ {r.download_count} download{r.download_count !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="resource-card-actions">
                <button
                  className="btn btn-accent btn-sm"
                  type="button"
                  onClick={() => handleDownload(r)}
                  disabled={downloading === r.id}
                >
                  {downloading === r.id ? "⏳" : "Download"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
