"use client";

import { useState, useEffect, useRef } from "react";
import { api, type Resource } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const CATEGORIES = ["cpd", "policy", "forms", "reports", "guides", "general"];
const CATEGORY_LABELS: Record<string, string> = {
  cpd: "CPD Materials", policy: "Policy Documents", forms: "Forms & Templates",
  reports: "Annual Reports", guides: "Guides & Handbooks", general: "General",
};

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

// ── Upload / Edit Modal ────────────────────────────────────────────────────
function ResourceModal({
  resource, onClose, onSaved,
}: {
  resource: Resource | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(resource?.title || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [category, setCategory] = useState(resource?.category || "general");
  const [visibility, setVisibility] = useState(resource?.visibility || "members");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    if (resource) {
      // Edit existing — update details
      const res = await api.updateResource(resource.id, { title, description, category, visibility });
      if (!res.error) onSaved();
    } else {
      // Upload new — requires file
      if (!file) { setSaving(false); return; }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("category", category);
      fd.append("visibility", visibility);
      const res = await api.uploadResource(fd);
      if (!res.error) onSaved();
    }
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{resource ? "Edit Document Details" : "Upload New Document"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="members">Members Only</option>
                <option value="public">Public</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>
          </div>
          {!resource && (
            <div className="form-group">
              <label>File *</label>
              <input type="file" required={!resource} onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV, ZIP (max 50 MB)
              </div>
            </div>
          )}
          <button type="submit" className="btn btn-accent" disabled={saving}>
            {saving ? "Saving…" : resource ? "Save Changes" : "Upload File"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Replace file modal ─────────────────────────────────────────────────────
function ReplaceModal({ resource, onClose, onSaved }: {
  resource: Resource; onClose: () => void; onSaved: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.replaceResourceFile(resource.id, fd);
    if (!res.error) onSaved();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>Replace File</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
          Current file: <strong>{resource.original_name}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New File *</label>
            <input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <button type="submit" className="btn btn-accent" disabled={saving || !file}>
            {saving ? "Replacing…" : "Replace File"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Confirm delete modal ───────────────────────────────────────────────────
function DeleteModal({ resource, onClose, onSaved }: {
  resource: Resource; onClose: () => void; onSaved: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await api.deleteResource(resource.id);
    if (!res.error) onSaved();
    setDeleting(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>Delete Document</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
          Are you sure you want to delete <strong>{resource.title}</strong>?<br />
          The file will be permanently removed. This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1 }}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Resource Page ───────────────────────────────────────────────
export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Modal state
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [replaceResource, setReplaceResource] = useState<Resource | null>(null);
  const [deleteResource, setDeleteResource] = useState<Resource | null>(null);

  function showToastMsg(msg: string, type = "") {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function loadResources() {
    setLoading(true);
    api.getResources().then((res) => {
      if (res.data) setResources(res.data.resources);
      setLoading(false);
    });
  }

  useEffect(() => { loadResources(); }, []);

  function handleSaved() {
    setShowUpload(false);
    setEditResource(null);
    setReplaceResource(null);
    setDeleteResource(null);
    loadResources();
    showToastMsg("Resource updated successfully.", "success");
  }

  const filtered = resources.filter((r) => {
    const matchSearch = !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filter === "all" || r.category === filter;
    return matchSearch && matchCat;
  });

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Resource Library Management</h3>
          <button className="btn btn-accent btn-sm" onClick={() => setShowUpload(true)}>
            + Upload File
          </button>
        </div>
        <div className="search-bar">
          <input type="text" placeholder="Search files…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Visibility</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Downloads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No resources found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      {r.description && <br />}
                      {r.description && <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.description}</span>}
                      <div style={{ fontSize: 11, color: "var(--border-strong)", marginTop: 2 }}>{r.original_name}</div>
                    </td>
                    <td><span className="badge badge-active">{CATEGORY_LABELS[r.category] || r.category}</span></td>
                    <td><span className={`badge ${r.visibility === "public" ? "badge-active" : r.visibility === "admin" ? "badge-suspended" : "badge-pending"}`}>{r.visibility}</span></td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{formatSize(r.file_size)}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>
                      {formatDate(r.created_at)}
                      {r.uploaded_by_name && <div style={{ fontSize: 11 }}>by {r.uploaded_by_name}</div>}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{r.download_count}</td>
                    <td className="actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => setReplaceResource(r)} title="Replace file">Replace</button>
                      <button className="btn btn-outline btn-xs" onClick={() => setEditResource(r)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteResource(r)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showUpload && <ResourceModal resource={null} onClose={() => setShowUpload(false)} onSaved={handleSaved} />}
      {editResource && <ResourceModal resource={editResource} onClose={() => setEditResource(null)} onSaved={handleSaved} />}
      {replaceResource && <ReplaceModal resource={replaceResource} onClose={() => setReplaceResource(null)} onSaved={handleSaved} />}
      {deleteResource && <DeleteModal resource={deleteResource} onClose={() => setDeleteResource(null)} onSaved={handleSaved} />}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
