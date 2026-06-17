"use client";

import { useState, useEffect } from "react";
import { api, type Resource } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "cpd", label: "CPD Materials" },
  { value: "policy", label: "Policy Documents" },
  { value: "forms", label: "Forms & Templates" },
  { value: "reports", label: "Annual Reports" },
  { value: "guides", label: "Guides & Handbooks" },
  { value: "general", label: "General" },
];

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

  const filtered = resources.filter((r) => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filter === "all" || r.category === filter;
    return matchSearch && matchCat;
  });

  return (
    <div className="card">
      <div className="card-header">
        <h3>Resources & Documents</h3>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          {resources.length} file{resources.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search documents by title or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      {loading ? (
        <p style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading resources…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Category</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.title}</strong>
                  {r.description && (
                    <br />
                  )}
                  {r.description && (
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.description}</span>
                  )}
                </td>
                <td>
                  <span style={{ background: "oklch(94% 0.03 255 / .40)", padding: "3px 10px", borderRadius: 999, fontSize: 12 }}>
                    {r.category}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{formatSize(r.file_size)}</td>
                <td style={{ fontSize: 13, color: "var(--muted)" }}>{formatDate(r.created_at)}</td>
                <td>
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => handleDownload(r)}
                    disabled={downloading === r.id}
                  >
                    {downloading === r.id ? "⏳" : "Download"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  No documents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
