"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Member {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  stateOfOrigin: string;
  lga: string;
  residentialAddress: string;
  category: string;
  mno: string;
  applicationStatus: string;
  rejectionReason: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  expiry: string | null;
  status: string;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  amount_kobo: number;
  reference: string;
  status: string;
  payment_type: string;
  paid_at: string | null;
  created_at: string;
}

function statusBadge(status: string) {
  const cls =
    status === "Active"
      ? "badge badge-active"
      : status === "Pending"
      ? "badge badge-pending"
      : status === "Expired"
      ? "badge badge-expired"
      : status === "Suspended"
      ? "badge badge-suspended"
      : "badge badge-expired";
  return <span className={cls}>{status}</span>;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Selection for CSV export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Panel (View)
  const [panel, setPanel] = useState<Member | null>(null);
  const [panelPayments, setPanelPayments] = useState<PaymentRecord[]>([]);
  const [panelPaymentsLoading, setPanelPaymentsLoading] = useState(false);

  // Approve modal
  const [showApprove, setShowApprove] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Member | null>(null);
  const [approveCode, setApproveCode] = useState("");
  const [approveNotes, setApproveNotes] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Member | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);

  // Add Member modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Record<string, string>>({
    firstName: "", lastName: "", email: "", phone: "", password: "",
    gender: "", stateOfOrigin: "", lga: "", category: "Member",
  });
  const [adding, setAdding] = useState(false);

  // Suspend modal
  const [showSuspend, setShowSuspend] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Member | null>(null);
  const [suspending, setSuspending] = useState(false);

  // Reinstate modal
  const [showReinstate, setShowReinstate] = useState(false);
  const [reinstateTarget, setReinstateTarget] = useState<Member | null>(null);
  const [reinstating, setReinstating] = useState(false);

  function showToast(msg: string, type: string) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    const res = await api.getMembers();
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.data) {
      setMembers(res.data.members);
    }
    setLoading(false);
  }

  // ─── Open detail panel with real payment history ─────────────────────────
  function openPanel(m: Member) {
    setPanel(m);
    setPanelPayments([]);
    setPanelPaymentsLoading(true);
    api.getMemberPayments(m.id).then((res) => {
      if (res.data) setPanelPayments(res.data.payments);
      setPanelPaymentsLoading(false);
    }).catch(() => setPanelPaymentsLoading(false));
  }

  // ─── Checkbox selection ─────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  }

  // ─── CSV Export ─────────────────────────────────────────────────────────
  function exportCSV(exportMembers: Member[]) {
    if (exportMembers.length === 0) {
      showToast("No members selected for export.", "error");
      return;
    }
    const headers = ["Name","Email","Phone","Membership No","Category","Chapter","Status","Expiry","Gender","State","LGA","Address","Joined"];
    const rows = exportMembers.map((m) => [
      m.name, m.email, m.phone, m.mno, m.category, m.lga || "—", m.status,
      m.expiry ? new Date(m.expiry).toLocaleDateString("en-GB") : "—",
      m.gender || "—", m.stateOfOrigin || "—", m.lga || "—",
      (m.residentialAddress || "—").replace(/,/g, " "),
      m.createdAt ? new Date(m.createdAt).toLocaleDateString("en-GB") : "—",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gkac-members-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${exportMembers.length} member(s).`, "success");
  }

  function handleExportSelected() {
    const selected = filtered.filter((m) => selectedIds.has(m.id));
    exportCSV(selected);
  }

  function handleExportAll() {
    exportCSV(filtered);
  }

  // ─── Add Member ─────────────────────────────────────────────────────────
  function openAdd() {
    setAddForm({ firstName: "", lastName: "", email: "", phone: "", password: "", gender: "", stateOfOrigin: "", lga: "", category: "Member" });
    setShowAdd(true);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password) {
      showToast("First name, last name, email, and password are required.", "error");
      return;
    }
    setAdding(true);
    const res = await api.createMember({
      firstName: addForm.firstName,
      lastName: addForm.lastName,
      email: addForm.email,
      phone: addForm.phone,
      password: addForm.password,
      gender: addForm.gender,
      stateOfOrigin: addForm.stateOfOrigin,
      lga: addForm.lga,
      categoryName: addForm.category,
    });
    setAdding(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Member created.", "success");
      setShowAdd(false);
      loadMembers();
    }
  }

  function updateMemberInList(updated: any) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === updated.id
          ? { ...m, ...updated, status: updated.status || m.status }
          : m
      )
    );
  }

  const filtered = members.filter((m) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      m.name.toLowerCase().includes(s) ||
      m.mno.toLowerCase().includes(s) ||
      m.email.toLowerCase().includes(s);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    const matchCat = filterCat === "all" || m.category === filterCat;
    return matchSearch && matchStatus && matchCat;
  });

  // ─── Approve ──────────────────────────────────────────────────────────────
  function openApprove(m: Member) {
    setApproveTarget(m);
    setApproveCode("");
    setApproveNotes("");
    setShowApprove(true);
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setApproving(true);
    const res = await api.approveMember(approveTarget.id, {
      membershipCode: approveCode || undefined,
      notes: approveNotes || undefined,
    });
    setApproving(false);
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.data) {
      showToast(res.data.message, "success");
      updateMemberInList(res.data.member);
      setShowApprove(false);
      setApproveTarget(null);
    }
  }

  // ─── Reject ────────────────────────────────────────────────────────────────
  function openReject(m: Member) {
    setRejectTarget(m);
    setRejectReason("");
    setShowReject(true);
  }

  async function handleReject() {
    if (!rejectTarget || !rejectReason.trim()) return;
    setRejecting(true);
    const res = await api.rejectMember(rejectTarget.id, rejectReason.trim());
    setRejecting(false);
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.data) {
      showToast(res.data.message, "error");
      updateMemberInList(res.data.member);
      setShowReject(false);
      setRejectTarget(null);
    }
  }

  // ─── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(m: Member) {
    setEditTarget(m);
    setEditForm({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      category: m.category,
      membershipCode: m.mno === "—" ? "" : m.mno,
    });
    setShowEdit(true);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setEditing(true);
    const res = await api.updateMember(editTarget.id, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      phone: editForm.phone,
      membershipCategoryName: editForm.category,
      membershipCode: editForm.membershipCode || null,
    });
    setEditing(false);
    if (res.error) {
      showToast(res.error, "error");
    } else if (res.data) {
      showToast(res.data.message, "success");
      updateMemberInList(res.data.member);
      setShowEdit(false);
      setEditTarget(null);
    }
  }

  // ─── Suspend ───────────────────────────────────────────────────────────────
  function openSuspend(m: Member) {
    setSuspendTarget(m);
    setShowSuspend(true);
  }

  async function handleSuspend() {
    if (!suspendTarget) return;
    setSuspending(true);
    const res = await api.suspendMember(suspendTarget.id);
    setSuspending(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Member suspended", "");
      updateMemberInList({ id: suspendTarget.id, status: "Suspended", isSuspended: true });
      setShowSuspend(false);
      setSuspendTarget(null);
    }
  }

  // ─── Reinstate ─────────────────────────────────────────────────────────────
  function openReinstate(m: Member) {
    setReinstateTarget(m);
    setShowReinstate(true);
  }

  async function handleReinstate() {
    if (!reinstateTarget) return;
    setReinstating(true);
    const res = await api.reinstateMember(reinstateTarget.id);
    setReinstating(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Member reinstated", "success");
      updateMemberInList({
        id: reinstateTarget.id,
        status: reinstateTarget.expiry && new Date(reinstateTarget.expiry) <= new Date() ? "Expired" : "Active",
        isSuspended: false,
      });
      setShowReinstate(false);
      setReinstateTarget(null);
    }
  }

  // ─── Remind ────────────────────────────────────────────────────────────────
  async function handleRemind(m: Member) {
    showToast(`Sending reminder to ${m.name}…`, "");
    const res = await api.remindMember(m.id);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || `Reminder sent to ${m.name}`, "success");
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h3>Member Management</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <button className="btn btn-accent btn-sm" onClick={handleExportSelected} disabled={selectedIds.size === 0}
                title="Export selected members">
                Export Selected{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleExportAll} style={{ marginLeft: 4 }}
                title="Export all filtered members">
                Export All
              </button>
            </div>
            <button className="btn btn-outline btn-sm" onClick={openAdd}>+ Add Member</button>
          </div>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, membership number, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Expired">Expired</option>
            <option value="Suspended">Suspended</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="Member">Member</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll} title="Select all" />
                </th>
                <th>Name</th>
                <th>Membership No</th>
                <th>Category</th>
                <th>Chapter</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    <span className="loader-dot" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    No members found.
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => (
                  <tr key={m.id || i}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(m.id)}
                        onChange={() => toggleSelect(m.id)} />
                    </td>
                    <td>
                      <strong>{m.name}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{m.email}</span>
                    </td>
                    <td>{m.mno}</td>
                    <td>{m.category}</td>
                    <td>{m.lga || "—"}</td>
                    <td>{statusBadge(m.status)}</td>
                    <td>{m.expiry ? new Date(m.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="actions">
                      <button className="btn btn-ghost btn-xs" onClick={() => openPanel(m)}>
                        View
                      </button>
                      <button className="btn btn-outline btn-xs" onClick={() => openEdit(m)}>
                        Edit
                      </button>
                      {m.status === "Pending" ? (
                        <>
                          <button className="btn btn-accent btn-xs" onClick={() => openApprove(m)}>
                            Approve
                          </button>
                          <button className="btn btn-danger btn-xs" onClick={() => openReject(m)}>
                            </button>
                        </>
                      ) : m.status === "Expired" ? (
                        <button
                          className="btn btn-accent btn-xs"
                          onClick={() => handleRemind(m)}
                        >
                          Remind
                        </button>
                      ) : m.status === "Suspended" ? (
                        <button
                          className="btn btn-accent btn-xs"
                          onClick={() => openReinstate(m)}
                        >
                          Reinstate
                        </button>
                      ) : m.status === "Active" ? (
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => openSuspend(m)}
                        >
                          Suspend
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Slide-out Panel ──────────────────────────────────────────────── */}
      <div className={`slide-panel-overlay${panel ? " open" : ""}`} onClick={() => setPanel(null)} />
      <div className={`slide-panel${panel ? " open" : ""}`}>
        {panel && (
          <>
            <button className="panel-close" onClick={() => setPanel(null)}>
              ✕
            </button>
            <h3>{panel.name}</h3>
            {statusBadge(panel.status)}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, margin: "16px 0" }}>
              <div><strong>Membership No</strong><br /><span style={{ color: "var(--muted)" }}>{panel.mno}</span></div>
              <div><strong>Category</strong><br /><span style={{ color: "var(--muted)" }}>{panel.category}</span></div>
              <div><strong>Chapter</strong><br /><span style={{ color: "var(--muted)" }}>{panel.lga || "—"}</span></div>
              <div><strong>Expiry</strong><br /><span style={{ color: "var(--muted)" }}>{panel.expiry ? new Date(panel.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
              <div><strong>Email</strong><br /><span style={{ color: "var(--muted)" }}>{panel.email}</span></div>
              <div><strong>Phone</strong><br /><span style={{ color: "var(--muted)" }}>{panel.phone}</span></div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Address</strong><br /><span style={{ color: "var(--muted)" }}>{panel.residentialAddress || "—"}</span></div>
            </div>
            <hr style={{ borderColor: "var(--border)", marginBottom: 16 }} />
            <h4>Payment History</h4>
            {panelPaymentsLoading ? (
              <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 16 }}><span className="loader-dot" /></p>
            ) : panelPayments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>No payment records found.</p>
            ) : (
              <table className="data-table" style={{ marginBottom: 16 }}>
                <thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>
                  {panelPayments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td style={{ fontSize: 12 }}>₦{(p.amount_kobo / 100).toLocaleString()}</td>
                      <td style={{ fontSize: 12 }}>{p.payment_type}</td>
                      <td><span className={`badge ${p.status === "confirmed" ? "badge-active" : "badge-pending"}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <h4>Activity Log</h4>
            <ul className="activity-list">
              <li><span className="activity-dot approval" /><div>Registered: {panel.createdAt ? new Date(panel.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div></li>
              {panelPayments.length > 0 && (
                <li><span className="activity-dot payment" /><div>Last payment: ₦{(panelPayments[0].amount_kobo / 100).toLocaleString()} ({panelPayments[0].payment_type})</div></li>
              )}
            </ul>
          </>
        )}
      </div>

      {/* ─── Approve Modal ────────────────────────────────────────────────── */}
      {showApprove && approveTarget && (
        <div className="modal-overlay open" onClick={() => setShowApprove(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowApprove(false)}>✕</button>
            <h3>Approve Application</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Approving: <strong>{approveTarget.name}</strong>
            </p>
            <div className="form-group">
              <label>Membership Number (auto-generated if left blank)</label>
              <input
                type="text"
                value={approveCode}
                onChange={(e) => setApproveCode(e.target.value)}
                placeholder="e.g. MEM-2025-00100"
              />
            </div>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Any notes for the member…"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
              />
            </div>
            <button
              className="btn btn-accent"
              style={{ width: "100%" }}
              disabled={approving}
              onClick={handleApprove}
            >
              {approving ? "Approving…" : "Confirm Approval"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Reject Modal ─────────────────────────────────────────────────── */}
      {showReject && rejectTarget && (
        <div className="modal-overlay open" onClick={() => setShowReject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReject(false)}>✕</button>
            <h3>Reject Application</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Rejecting: <strong>{rejectTarget.name}</strong>
            </p>
            <div className="form-group">
              <label>Reason for Rejection *</label>
              <textarea
                rows={3}
                required
                placeholder="Provide a reason that will be emailed to the applicant…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <button
              className="btn btn-danger"
              style={{ width: "100%" }}
              disabled={rejecting || !rejectReason.trim()}
              onClick={handleReject}
            >
              {rejecting ? "Rejecting…" : "Reject Application"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ───────────────────────────────────────────────────── */}
      {showEdit && editTarget && (
        <div className="modal-overlay open" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            <h3>Edit Member</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Editing: <strong>{editTarget.name}</strong>
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editForm.firstName || ""}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName || ""}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={editForm.category || ""}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                >
                  <option value="Member">Member</option>
                </select>
              </div>
              <div className="form-group">
                <label>Membership No</label>
                <input
                  type="text"
                  value={editForm.membershipCode || ""}
                  onChange={(e) => setEditForm({ ...editForm, membershipCode: e.target.value })}
                />
              </div>
            </div>
            <button
              className="btn btn-accent"
              style={{ width: "100%", marginTop: 14 }}
              disabled={editing}
              onClick={handleEdit}
            >
              {editing ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Add Member Modal ────────────────────────────────────────────── */}
      {showAdd && (
        <div className="modal-overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            <h3>Add New Member</h3>
            <form onSubmit={handleAdd}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label>First Name *</label>
                  <input type="text" required value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input type="text" required value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" required value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" required value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}>
                    <option value="Member">Member</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}>
                    <option value="">—</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>State of Origin</label>
                  <input type="text" value={addForm.stateOfOrigin}
                    onChange={(e) => setAddForm({ ...addForm, stateOfOrigin: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>LGA / Chapter</label>
                  <input type="text" value={addForm.lga}
                    onChange={(e) => setAddForm({ ...addForm, lga: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-accent" style={{ width: "100%", marginTop: 14 }}
                disabled={adding} type="submit">
                {adding ? "Creating…" : "Create Member"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Suspend Modal ────────────────────────────────────────────────── */}
      {showSuspend && suspendTarget && (
        <div className="modal-overlay open" onClick={() => setShowSuspend(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSuspend(false)}>✕</button>
            <h3>Suspend Member</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to suspend <strong>{suspendTarget.name}</strong>?
            </p>
            <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 16 }}>
              Suspended members cannot access member-only resources or vote in elections until reinstated.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setShowSuspend(false); setSuspendTarget(null); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={suspending}
                onClick={handleSuspend}
              >
                {suspending ? "Suspending…" : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reinstate Modal ──────────────────────────────────────────────── */}
      {showReinstate && reinstateTarget && (
        <div className="modal-overlay open" onClick={() => setShowReinstate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReinstate(false)}>✕</button>
            <h3>Reinstate Member</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to reinstate <strong>{reinstateTarget.name}</strong>?
            </p>
            <p style={{ fontSize: 12, color: "var(--text)", marginBottom: 16 }}>
              This will restore the member&apos;s access to member-only resources.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setShowReinstate(false); setReinstateTarget(null); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={reinstating}
                onClick={handleReinstate}
              >
                {reinstating ? "Reinstating…" : "Confirm Reinstate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ────────────────────────────────────────────────────────── */}
      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
