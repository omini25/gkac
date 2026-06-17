"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string; name: string; description: string | null;
  fee_kobo: number; min_experience_years: number | null;
  sort_order: number; is_active: boolean;
  created_at: string; updated_at: string;
}

interface EmailTemplate {
  id: string; name: string; subject: string; body: string;
  variables: string[]; created_at: string; updated_at: string;
}

interface AdminUser {
  id: string; name: string; email: string;
  role: string; isVerified: boolean; createdAt: string;
}

function fmtKobo(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminSettingsPage() {
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Category modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [catEdit, setCatEdit] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: "", description: "", fee_kobo: "", min_experience_years: "", sort_order: "" });
  const [catSaving, setCatSaving] = useState(false);
  const [showCatDelete, setShowCatDelete] = useState(false);
  const [catDelete, setCatDelete] = useState<Category | null>(null);

  // Template modals
  const [showTmplModal, setShowTmplModal] = useState(false);
  const [tmplEdit, setTmplEdit] = useState<EmailTemplate | null>(null);
  const [tmplForm, setTmplForm] = useState({ name: "", subject: "", body: "", variables: "" });
  const [tmplSaving, setTmplSaving] = useState(false);
  const [showTmplDelete, setShowTmplDelete] = useState(false);
  const [tmplDelete, setTmplDelete] = useState<EmailTemplate | null>(null);

  // Admin modals
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);
  const [showAdminRevoke, setShowAdminRevoke] = useState(false);
  const [adminRevoke, setAdminRevoke] = useState<AdminUser | null>(null);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [catRes, tmplRes, adminRes] = await Promise.all([
      api.getAdminCategories(),
      api.getEmailTemplates(),
      api.getAdmins(),
    ]);
    if (catRes.error) showToast(catRes.error, "error");
    else if (catRes.data) setCategories(catRes.data.categories);
    if (tmplRes.error) showToast(tmplRes.error, "error");
    else if (tmplRes.data) setTemplates(tmplRes.data.templates);
    if (adminRes.error) showToast(adminRes.error, "error");
    else if (adminRes.data) setAdmins(adminRes.data.admins);
    setLoading(false);
  }

  // ═══ Categories ═══════════════════════════════════════════════════════════

  function openNewCat() {
    setCatEdit(null);
    setCatForm({ name: "", description: "", fee_kobo: "", min_experience_years: "", sort_order: String(categories.length + 1) });
    setShowCatModal(true);
  }

  function openEditCat(c: Category) {
    setCatEdit(c);
    setCatForm({
      name: c.name,
      description: c.description || "",
      fee_kobo: String(c.fee_kobo),
      min_experience_years: c.min_experience_years != null ? String(c.min_experience_years) : "",
      sort_order: String(c.sort_order),
    });
    setShowCatModal(true);
  }

  async function saveCategory() {
    if (!catForm.name || !catForm.fee_kobo) return;
    setCatSaving(true);
    const payload = {
      name: catForm.name,
      description: catForm.description || undefined,
      fee_kobo: parseInt(catForm.fee_kobo, 10),
      min_experience_years: catForm.min_experience_years ? parseInt(catForm.min_experience_years, 10) : undefined,
      sort_order: catForm.sort_order ? parseInt(catForm.sort_order, 10) : undefined,
    };
    const res = catEdit
      ? await api.updateCategory(catEdit.id, payload)
      : await api.createCategory(payload);
    setCatSaving(false);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(catEdit ? "Category updated." : "Category created.", "success");
    setShowCatModal(false);
    loadAll();
  }

  function openDeleteCat(c: Category) {
    setCatDelete(c);
    setShowCatDelete(true);
  }

  async function confirmDeleteCat() {
    if (!catDelete) return;
    const res = await api.deleteCategory(catDelete.id);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(res.data?.message || "Category deactivated.", "success");
    setShowCatDelete(false);
    setCatDelete(null);
    loadAll();
  }

  // ═══ Email Templates ══════════════════════════════════════════════════════

  function openNewTmpl() {
    setTmplEdit(null);
    setTmplForm({ name: "", subject: "", body: "", variables: "" });
    setShowTmplModal(true);
  }

  function openEditTmpl(t: EmailTemplate) {
    setTmplEdit(t);
    setTmplForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      variables: t.variables.join(", "),
    });
    setShowTmplModal(true);
  }

  async function saveTemplate() {
    if (!tmplForm.name || !tmplForm.subject || !tmplForm.body) return;
    setTmplSaving(true);
    const payload = {
      name: tmplForm.name,
      subject: tmplForm.subject,
      body: tmplForm.body,
      variables: tmplForm.variables ? tmplForm.variables.split(",").map((v: string) => v.trim()).filter(Boolean) : [],
    };
    const res = tmplEdit
      ? await api.updateEmailTemplate(tmplEdit.id, payload)
      : await api.createEmailTemplate(payload);
    setTmplSaving(false);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(tmplEdit ? "Template updated." : "Template created.", "success");
    setShowTmplModal(false);
    loadAll();
  }

  function openDeleteTmpl(t: EmailTemplate) {
    setTmplDelete(t);
    setShowTmplDelete(true);
  }

  async function confirmDeleteTmpl() {
    if (!tmplDelete) return;
    const res = await api.deleteEmailTemplate(tmplDelete.id);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(res.data?.message || "Template deleted.", "success");
    setShowTmplDelete(false);
    setTmplDelete(null);
    loadAll();
  }

  // ═══ Admin Users ══════════════════════════════════════════════════════════

  function openAddAdmin() {
    setAdminEmail("");
    setShowAdminModal(true);
  }

  async function confirmAddAdmin() {
    if (!adminEmail.trim()) return;
    setAdminSaving(true);
    const res = await api.addAdmin(adminEmail.trim());
    setAdminSaving(false);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(res.data?.message || "Admin added.", "success");
    setShowAdminModal(false);
    if (res.data?.admin) setAdmins((prev) => [...prev, res.data!.admin]);
  }

  function openRevokeAdmin(u: AdminUser) {
    setAdminRevoke(u);
    setShowAdminRevoke(true);
  }

  async function confirmRevokeAdmin() {
    if (!adminRevoke) return;
    const res = await api.removeAdmin(adminRevoke.id);
    if (res.error) { showToast(res.error, "error"); return; }
    showToast(res.data?.message || "Admin access revoked.", "success");
    setAdmins((prev) => prev.filter((a) => a.id !== adminRevoke!.id));
    setShowAdminRevoke(false);
    setAdminRevoke(null);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading settings…</div>;
  }

  return (
    <>
      {/* ═══ Membership Categories & Fees ════════════════════════════════════ */}
      <div className="card">
        <div className="card-header">
          <h3>Membership Categories &amp; Fees</h3>
          <button className="btn btn-accent btn-sm" onClick={openNewCat}>+ Add Category</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Annual Dues</th>
                <th>Description</th>
                <th>Min Experience</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 16, color: "var(--muted)" }}>No categories yet.</td></tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{fmtKobo(c.fee_kobo)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.description || "—"}</td>
                    <td>{c.min_experience_years != null ? `${c.min_experience_years}+ yrs` : "—"}</td>
                    <td>{c.sort_order}</td>
                    <td>
                      <span className={c.is_active ? "badge badge-active" : "badge badge-expired"}>
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => openEditCat(c)}>Edit</button>
                      {c.is_active && (
                        <button className="btn btn-danger btn-xs" onClick={() => openDeleteCat(c)}>Deactivate</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Email Templates ═════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card-header">
          <h3>Email Templates</h3>
          <button className="btn btn-outline btn-sm" onClick={openNewTmpl}>+ New Template</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Subject</th>
                <th>Variables</th>
                <th>Last Edited</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 16, color: "var(--muted)" }}>No email templates yet.</td></tr>
              ) : (
                templates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{t.subject}</td>
                    <td><code style={{ fontSize: 11 }}>{t.variables.join(", ") || "—"}</code></td>
                    <td>{fmtDate(t.updated_at)}</td>
                    <td className="actions">
                      <button className="btn btn-outline btn-xs" onClick={() => openEditTmpl(t)}>Edit</button>
                      <button className="btn btn-danger btn-xs" onClick={() => openDeleteTmpl(t)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Admin Users ═════════════════════════════════════════════════════ */}
      <div className="card">
        <div className="card-header">
          <h3>Admin User Management</h3>
          <button className="btn btn-accent btn-sm" onClick={openAddAdmin}>+ Add Admin</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Since</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 16, color: "var(--muted)" }}>No admin users.</td></tr>
              ) : (
                admins.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={u.isVerified ? "badge badge-active" : "badge badge-expired"}>
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{fmtDate(u.createdAt)}</td>
                    <td className="actions">
                      {u.email !== "admin@gkac.org" && (
                        <button className="btn btn-danger btn-xs" onClick={() => openRevokeAdmin(u)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Category Modal (Add/Edit) ─────────────────────────────────── */}
      {showCatModal && (
        <div className="modal-overlay open" onClick={() => setShowCatModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setShowCatModal(false)}>✕</button>
            <h3>{catEdit ? "Edit Category" : "Add Category"}</h3>
            <div className="form-group">
              <label>Category Name *</label>
              <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Fellow" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} placeholder="e.g. 15+ years distinguished practice" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>Annual Dues (kobo) *</label>
                <input type="number" value={catForm.fee_kobo} onChange={(e) => setCatForm({ ...catForm, fee_kobo: e.target.value })} placeholder="e.g. 3500000" />
              </div>
              <div className="form-group">
                <label>Min Experience (years)</label>
                <input type="number" value={catForm.min_experience_years} onChange={(e) => setCatForm({ ...catForm, min_experience_years: e.target.value })} placeholder="e.g. 5" />
              </div>
            </div>
            <div className="form-group">
              <label>Sort Order</label>
              <input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} />
            </div>
            <button className="btn btn-accent" style={{ width: "100%" }} disabled={catSaving || !catForm.name || !catForm.fee_kobo} onClick={saveCategory}>
              {catSaving ? "Saving…" : catEdit ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Category Delete Confirmation ──────────────────────────────── */}
      {showCatDelete && catDelete && (
        <div className="modal-overlay open" onClick={() => setShowCatDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCatDelete(false)}>✕</button>
            <h3>Deactivate Category</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to deactivate <strong>{catDelete.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowCatDelete(false); setCatDelete(null); }}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDeleteCat}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Template Modal (Add/Edit) ────────────────────────────────── */}
      {showTmplModal && (
        <div className="modal-overlay open" onClick={() => setShowTmplModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setShowTmplModal(false)}>✕</button>
            <h3>{tmplEdit ? "Edit Template" : "New Template"}</h3>
            <div className="form-group">
              <label>Template Name *</label>
              <input value={tmplForm.name} onChange={(e) => setTmplForm({ ...tmplForm, name: e.target.value })} placeholder="e.g. Renewal Reminder" />
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <input value={tmplForm.subject} onChange={(e) => setTmplForm({ ...tmplForm, subject: e.target.value })} placeholder="e.g. Your membership is due for renewal" />
            </div>
            <div className="form-group">
              <label>Body *</label>
              <textarea
                rows={8}
                value={tmplForm.body}
                onChange={(e) => setTmplForm({ ...tmplForm, body: e.target.value })}
                placeholder="Use {{variable}} for placeholders…"
                style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.5 }}
              />
            </div>
            <div className="form-group">
              <label>Variables (comma-separated)</label>
              <input value={tmplForm.variables} onChange={(e) => setTmplForm({ ...tmplForm, variables: e.target.value })} placeholder="e.g. name, membership_code, reset_link" />
            </div>
            <button className="btn btn-accent" style={{ width: "100%" }} disabled={tmplSaving || !tmplForm.name || !tmplForm.subject || !tmplForm.body} onClick={saveTemplate}>
              {tmplSaving ? "Saving…" : tmplEdit ? "Save Changes" : "Create Template"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Template Delete Confirmation ─────────────────────────────── */}
      {showTmplDelete && tmplDelete && (
        <div className="modal-overlay open" onClick={() => setShowTmplDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowTmplDelete(false)}>✕</button>
            <h3>Delete Template</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to delete <strong>{tmplDelete.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowTmplDelete(false); setTmplDelete(null); }}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDeleteTmpl}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Admin Modal ──────────────────────────────────────────── */}
      {showAdminModal && (
        <div className="modal-overlay open" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={() => setShowAdminModal(false)}>✕</button>
            <h3>Add Admin User</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Enter the email of an existing user to grant them admin access.
            </p>
            <div className="form-group">
              <label>User Email *</label>
              <input value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="user@gkac.org" type="email" />
            </div>
            <button className="btn btn-accent" style={{ width: "100%" }} disabled={adminSaving || !adminEmail.trim()} onClick={confirmAddAdmin}>
              {adminSaving ? "Adding…" : "Grant Admin Access"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Revoke Admin Confirmation ────────────────────────────────── */}
      {showAdminRevoke && adminRevoke && (
        <div className="modal-overlay open" onClick={() => setShowAdminRevoke(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminRevoke(false)}>✕</button>
            <h3>Revoke Admin Access</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to remove admin access from <strong>{adminRevoke.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowAdminRevoke(false); setAdminRevoke(null); }}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmRevokeAdmin}>Revoke Access</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
