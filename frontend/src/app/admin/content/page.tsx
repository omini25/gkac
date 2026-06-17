"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import type { NewsItem, EventItem, LeaderItem, FaqItem } from "@/lib/api";

const TABS = [
  { id: "ct-news", label: "News & Announcements" },
  { id: "ct-events", label: "Events" },
  { id: "ct-leadership", label: "Leadership" },
  { id: "ct-faq", label: "FAQ" },
];

// ── Reusable modals ────────────────────────────────────────────────────────
function NewsModal({ item, onClose, onSaved }: { item: NewsItem | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || "");
  const [body, setBody] = useState(item?.body || "");
  const [status, setStatus] = useState(item?.status || "draft");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { title, body, status };
    const res = item
      ? await api.updateContent<NewsItem>("news", item.id, data)
      : await api.createContent<NewsItem>("news", data);
    if (!res.error) onSaved();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{item ? "Edit News Post" : "New News Post"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Body *</label>
            <textarea rows={6} required value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <button type="submit" className="btn btn-accent" disabled={saving}>{saving ? "Saving…" : item ? "Save Changes" : "Create Post"}</button>
        </form>
      </div>
    </div>
  );
}

function EventModal({ item, onClose, onSaved }: { item: EventItem | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [location, setLocation] = useState(item?.location || "");
  const [eventDate, setEventDate] = useState(item?.event_date || "");
  const [eventTime, setEventTime] = useState(item?.event_time || "");
  const [badgeLabel, setBadgeLabel] = useState(item?.badge_label || "");
  const [status, setStatus] = useState(item?.status || "open");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { title, description, location, eventDate, eventTime, badgeLabel, status };
    const res = item
      ? await api.updateContent<EventItem>("events", item.id, data)
      : await api.createContent<EventItem>("events", data);
    if (!res.error) onSaved();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{item ? "Edit Event" : "New Event"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Title *</label><input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-group"><label>Description</label><textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Location</label><input type="text" value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            <div className="form-group"><label>Event Date *</label><input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Time</label><input type="text" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="e.g. 9:00 AM – 5:00 PM" /></div>
            <div className="form-group"><label>Badge Label</label><input type="text" value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="e.g. Registration Open" /></div>
          </div>
          <div className="form-group"><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="open">Open</option><option value="invitation">Invitation Only</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option>
          </select></div>
          <button type="submit" className="btn btn-accent" disabled={saving}>{saving ? "Saving…" : item ? "Save Changes" : "Create Event"}</button>
        </form>
      </div>
    </div>
  );
}

function LeaderModal({ item, onClose, onSaved }: { item: LeaderItem | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || "");
  const [role, setRole] = useState(item?.role || "");
  const [bio, setBio] = useState(item?.bio || "");
  const [termLabel, setTermLabel] = useState(item?.term_label || "");
  const [sortOrder, setSortOrder] = useState(item?.sort_order || 0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { name, role, bio, termLabel, sortOrder, isActive: true };
    const res = item
      ? await api.updateContent<LeaderItem>("leadership", item.id, data)
      : await api.createContent<LeaderItem>("leadership", data);
    if (!res.error) onSaved();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{item ? "Edit Official" : "Add Official"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>Name *</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="form-group"><label>Position *</label><input type="text" required value={role} onChange={(e) => setRole(e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Bio</label><textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Term Label</label><input type="text" value={termLabel} onChange={(e) => setTermLabel(e.target.value)} placeholder="e.g. 2023–2025" /></div>
            <div className="form-group"><label>Display Order</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
          </div>
          <button type="submit" className="btn btn-accent" disabled={saving}>{saving ? "Saving…" : item ? "Save Changes" : "Add Official"}</button>
        </form>
      </div>
    </div>
  );
}

function FaqModal({ item, onClose, onSaved }: { item: FaqItem | null; onClose: () => void; onSaved: () => void }) {
  const [question, setQuestion] = useState(item?.question || "");
  const [answer, setAnswer] = useState(item?.answer || "");
  const [category, setCategory] = useState(item?.category || "general");
  const [sortOrder, setSortOrder] = useState(item?.sort_order || 0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const data = { question, answer, category, sortOrder };
    const res = item
      ? await api.updateContent<FaqItem>("faq", item.id, data)
      : await api.createContent<FaqItem>("faq", data);
    if (!res.error) onSaved();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>{item ? "Edit FAQ" : "Add FAQ"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Question *</label><input type="text" required value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
          <div className="form-group"><label>Answer *</label><textarea rows={4} required value={answer} onChange={(e) => setAnswer(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="general">General</option><option value="membership">Membership</option>
                <option value="verification">Verification</option><option value="dues">Dues & Payments</option>
                <option value="elections">Elections</option>
              </select>
            </div>
            <div className="form-group"><label>Sort Order</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} /></div>
          </div>
          <button type="submit" className="btn btn-accent" disabled={saving}>{saving ? "Saving…" : item ? "Save Changes" : "Add Question"}</button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDelete({ type, item, onClose, onSaved }: { type: string; item: any; onClose: () => void; onSaved: () => void }) {
  const [deleting, setDeleting] = useState(false);
  async function handleDelete() {
    setDeleting(true);
    const res = await api.deleteContent(type as any, item.id);
    if (!res.error) onSaved();
    setDeleting(false);
  }
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>Delete Item</h3>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>Are you sure you want to delete "{item?.title || item?.name || item?.question}"? This cannot be undone.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting} style={{ flex: 1 }}>{deleting ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState("ct-news");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Modal state
  const [editNews, setEditNews] = useState<NewsItem | null>(null);
  const [showNewNews, setShowNewNews] = useState(false);
  const [editEvent, setEditEvent] = useState<EventItem | null>(null);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [editLeader, setEditLeader] = useState<LeaderItem | null>(null);
  const [showNewLeader, setShowNewLeader] = useState(false);
  const [editFaq, setEditFaq] = useState<FaqItem | null>(null);
  const [showNewFaq, setShowNewFaq] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: string; item: any } | null>(null);

  function showToastMsg(msg: string, type = "") {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function loadAll() {
    setLoading(true);
    Promise.all([
      api.getContent<NewsItem>("news", true).then(r => { if (r.data) setNews(r.data.items); }),
      api.getContent<EventItem>("events", true).then(r => { if (r.data) setEvents(r.data.items); }),
      api.getContent<LeaderItem>("leadership", true).then(r => { if (r.data) setLeaders(r.data.items); }),
      api.getContent<FaqItem>("faq", true).then(r => { if (r.data) setFaqs(r.data.items); }),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  function handleSaved() {
    setShowNewNews(false); setEditNews(null);
    setShowNewEvent(false); setEditEvent(null);
    setShowNewLeader(false); setEditLeader(null);
    setShowNewFaq(false); setEditFaq(null);
    setDeleteItem(null);
    loadAll();
    showToastMsg("Saved successfully.", "success");
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab-btn${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ── News Tab ── */}
      <div className={`tab-panel${activeTab === "ct-news" ? " active" : ""}`}>
        <div className="card">
          <div className="card-header"><h3>News & Announcements</h3><button className="btn btn-accent btn-sm" onClick={() => setShowNewNews(true)}>+ New Post</button></div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {news.map((n) => (
                  <tr key={n.id}>
                    <td><strong>{n.title}</strong></td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{formatDate(n.created_at)}</td>
                    <td><span className={`badge ${n.status === "published" ? "badge-active" : "badge-pending"}`}>{n.status}</span></td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => setEditNews(n)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteItem({ type: "news", item: n })}>Delete</button>
                    </td>
                  </tr>
                ))}
                {news.length === 0 && !loading && <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No news posts.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Events Tab ── */}
      <div className={`tab-panel${activeTab === "ct-events" ? " active" : ""}`}>
        <div className="card">
          <div className="card-header"><h3>Events Management</h3><button className="btn btn-accent btn-sm" onClick={() => setShowNewEvent(true)}>+ New Event</button></div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Event</th><th>Date</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td><strong>{e.title}</strong>{e.description && <br />}{e.description && <span style={{ fontSize: 12, color: "var(--muted)" }}>{e.description}</span>}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{formatDate(e.event_date)}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{e.location || "—"}</td>
                    <td><span className={`badge ${e.status === "open" ? "badge-active" : "badge-pending"}`}>{e.status}</span></td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => setEditEvent(e)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteItem({ type: "events", item: e })}>Delete</button>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && !loading && <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No events.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Leadership Tab ── */}
      <div className={`tab-panel${activeTab === "ct-leadership" ? " active" : ""}`}>
        <div className="card">
          <div className="card-header"><h3>Leadership / Officials Management</h3><button className="btn btn-accent btn-sm" onClick={() => setShowNewLeader(true)}>+ Add Official</button></div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Position</th><th>Term</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.name}</strong></td>
                    <td>{l.role}</td>
                    <td style={{ fontSize: 13, color: "var(--muted)" }}>{l.term_label || "—"}</td>
                    <td>{l.sort_order}</td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => setEditLeader(l)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteItem({ type: "leadership", item: l })}>Delete</button>
                    </td>
                  </tr>
                ))}
                {leaders.length === 0 && !loading && <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No officials.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── FAQ Tab ── */}
      <div className={`tab-panel${activeTab === "ct-faq" ? " active" : ""}`}>
        <div className="card">
          <div className="card-header"><h3>FAQ Management</h3><button className="btn btn-accent btn-sm" onClick={() => setShowNewFaq(true)}>+ Add Question</button></div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead><tr><th>Question</th><th>Category</th><th>Order</th><th>Actions</th></tr></thead>
              <tbody>
                {faqs.map((f) => (
                  <tr key={f.id}>
                    <td>{f.question}</td>
                    <td><span className="badge badge-active">{f.category}</span></td>
                    <td>{f.sort_order}</td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => setEditFaq(f)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => setDeleteItem({ type: "faq", item: f })}>Delete</button>
                    </td>
                  </tr>
                ))}
                {faqs.length === 0 && !loading && <tr><td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No FAQ items.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showNewNews && <NewsModal item={null} onClose={() => setShowNewNews(false)} onSaved={handleSaved} />}
      {editNews && <NewsModal item={editNews} onClose={() => setEditNews(null)} onSaved={handleSaved} />}
      {showNewEvent && <EventModal item={null} onClose={() => setShowNewEvent(false)} onSaved={handleSaved} />}
      {editEvent && <EventModal item={editEvent} onClose={() => setEditEvent(null)} onSaved={handleSaved} />}
      {showNewLeader && <LeaderModal item={null} onClose={() => setShowNewLeader(false)} onSaved={handleSaved} />}
      {editLeader && <LeaderModal item={editLeader} onClose={() => setEditLeader(null)} onSaved={handleSaved} />}
      {showNewFaq && <FaqModal item={null} onClose={() => setShowNewFaq(false)} onSaved={handleSaved} />}
      {editFaq && <FaqModal item={editFaq} onClose={() => setEditFaq(null)} onSaved={handleSaved} />}
      {deleteItem && <ConfirmDelete type={deleteItem.type} item={deleteItem.item} onClose={() => setDeleteItem(null)} onSaved={handleSaved} />}

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
