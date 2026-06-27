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

  mno: string;
  applicationStatus: string;
  rejectionReason: string | null;
  isVerified: boolean;
  isSuspended: boolean;
  expiry: string | null;
  status: string;
  createdAt: string;
  annualDuePaid?: boolean;
  annualDueYear?: number | null;
  annualDevelopmentalFeePaid?: boolean;
  annualDevelopmentalFeeYear?: number | null;
  developmentalLevyAmount?: number | null;

  // Verification / ID fields
  nin: string | null;
  altIdType: string | null;
  altIdNum: string | null;
  hasNin: boolean;
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

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null);
    }
    if (openMenuId) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  // Dues confirmation modal
  const [showDuesModal, setShowDuesModal] = useState(false);
  const [duesTarget, setDuesTarget] = useState<Member | null>(null);
  const [duesForm, setDuesForm] = useState({ markAnnualDue: false, markDevelopmentalFee: false, developmentalAmount: "" });
  const [confirmingDues, setConfirmingDues] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset Password modal
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdTarget, setResetPwdTarget] = useState<Member | null>(null);
  const [resetPwdMode, setResetPwdMode] = useState<"email" | "manual">("email");
  const [resetPwdNewPassword, setResetPwdNewPassword] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);

  // NIN Verification modal
  const [showNinVerify, setShowNinVerify] = useState(false);
  const [ninVerifyTarget, setNinVerifyTarget] = useState<Member | null>(null);
  const [ninVerifying, setNinVerifying] = useState(false);
  const [ninVerifyResult, setNinVerifyResult] = useState<{
    verified: boolean;
    message: string;
    nin: string;
    data?: {
      firstName: string;
      lastName: string;
      middlename: string;
      dateOfBirth: string;
      gender: string;
      phone: string;
      photo: string;
      signature?: string;
      address: string;
      stateOfOrigin: string;
      lga: string;
      maritalStatus: string;
      profession: string;
      educationalLevel: string;
      employmentStatus: string;
      religion: string;
    };
  } | null>(null);

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

  // ─── Open detail panel with real payment history & dues info ─────────────
  function openPanel(m: Member) {
    setPanel(m);
    setPanelPayments([]);
    setPanelPaymentsLoading(true);
    Promise.all([
      api.getMember(m.id),
      api.getMemberPayments(m.id),
    ]).then(([memberRes, payRes]) => {
      if (memberRes.data?.member) {
        setPanel(memberRes.data.member as Member);
      }
      if (payRes.data) setPanelPayments(payRes.data.payments);
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
    const headers = ["Name","Email","Phone","Membership No","Chapter","Status","Expiry","Gender","State","LGA","Address","Joined"];
    const rows = exportMembers.map((m) => [
      m.name, m.email, m.phone, m.mno, m.lga || "—", m.status,
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
    setAddForm({ firstName: "", lastName: "", email: "", phone: "", password: "", gender: "", stateOfOrigin: "", lga: "" });
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
      membershipCategoryName: "Member",
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
    return matchSearch && matchStatus;
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
      nin: m.nin || "",
      altIdType: m.altIdType || "",
      altIdNum: m.altIdNum || "",
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
      membershipCategoryName: "Member",
      nin: editForm.nin || null,
      altIdType: editForm.altIdType || null,
      altIdNum: editForm.altIdNum || null,
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

  // ─── Delete ────────────────────────────────────────────────────────────────
  function openDelete(m: Member) {
    setDeleteTarget(m);
    setShowDelete(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await api.deleteMember(deleteTarget.id);
    setDeleting(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Member deleted.", "success");
      setShowDelete(false);
      setDeleteTarget(null);
      loadMembers();
    }
  }

  // ─── Reset Password ────────────────────────────────────────────────────────
  function openResetPwd(m: Member) {
    setResetPwdTarget(m);
    setResetPwdMode("email");
    setResetPwdNewPassword("");
    setShowResetPwd(true);
  }

  async function handleSendResetEmail() {
    if (!resetPwdTarget) return;
    setResettingPwd(true);
    const res = await api.adminSendResetPassword(resetPwdTarget.id);
    setResettingPwd(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Password reset email sent.", "success");
      setShowResetPwd(false);
      setResetPwdTarget(null);
    }
  }

  async function handleForceResetPassword() {
    if (!resetPwdTarget) return;
    if (!resetPwdNewPassword || resetPwdNewPassword.length < 8 || !/[a-zA-Z]/.test(resetPwdNewPassword) || !/[0-9]/.test(resetPwdNewPassword)) {
      showToast("Password must be at least 8 characters with a number and a letter.", "error");
      return;
    }
    setResettingPwd(true);
    const res = await api.adminForceResetPassword(resetPwdTarget.id, resetPwdNewPassword);
    setResettingPwd(false);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast(res.data?.message || "Password reset successfully.", "success");
      setShowResetPwd(false);
      setResetPwdTarget(null);
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

  // ─── NIN Verification via Prembly ──────────────────────────────────────────
  function openNinVerify(m: Member) {
    setNinVerifyTarget(m);
    setNinVerifyResult(null);
    setShowNinVerify(true);
  }

  async function handleVerifyNIN() {
    if (!ninVerifyTarget) return;
    setNinVerifying(true);
    setNinVerifyResult(null);
    const res = await api.verifyMemberNIN(ninVerifyTarget.id);
    setNinVerifying(false);
    if (res.error) {
      setNinVerifyResult({ verified: false, message: res.error, nin: "" });
    } else if (res.data) {
      setNinVerifyResult({
        verified: res.data.verified,
        message: res.data.message,
        nin: res.data.nin,
        data: res.data.data,
      });
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
                <th>Chapter</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
                    <span className="loader-dot" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
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
                    <td>{m.lga || "—"}</td>
                    <td>{statusBadge(m.status)}</td>
                    <td>{m.expiry ? new Date(m.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="actions">
                      <div className="dropdown-wrapper">
                        <button
                          className="btn btn-ghost btn-xs dropdown-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === m.id ? null : m.id);
                          }}
                          title="Actions"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="8" cy="3" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13" r="1.5" />
                          </svg>
                        </button>
                        {openMenuId === m.id && (
                          <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="dropdown-item" onClick={() => { openPanel(m); setOpenMenuId(null); }}>
                              👁 View
                            </button>
                            <button className="dropdown-item" onClick={() => { openEdit(m); setOpenMenuId(null); }}>
                              ✏️ Edit
                            </button>
                            <button className="dropdown-item" onClick={() => { openResetPwd(m); setOpenMenuId(null); }}>
                              🔑 Reset Pwd
                            </button>
                            <button className="dropdown-item" onClick={() => { openNinVerify(m); setOpenMenuId(null); }}>
                              🆔 Verify NIN
                            </button>
                            <div className="dropdown-divider" />
                            {m.status === "Pending" ? (
                              <>
                                <button className="dropdown-item accent" onClick={() => { openApprove(m); setOpenMenuId(null); }}>
                                  ✅ Approve
                                </button>
                                <button className="dropdown-item danger" onClick={() => { openReject(m); setOpenMenuId(null); }}>
                                  ❌ Reject
                                </button>
                              </>
                            ) : m.status === "Expired" ? (
                              <button className="dropdown-item accent" onClick={() => { handleRemind(m); setOpenMenuId(null); }}>
                                📧 Remind
                              </button>
                            ) : m.status === "Suspended" ? (
                              <button className="dropdown-item accent" onClick={() => { openReinstate(m); setOpenMenuId(null); }}>
                                🔄 Reinstate
                              </button>
                            ) : m.status === "Active" ? (
                              <button className="dropdown-item danger" onClick={() => { openSuspend(m); setOpenMenuId(null); }}>
                                ⏸ Suspend
                              </button>
                            ) : null}
                            <div className="dropdown-divider" />
                            <button className="dropdown-item danger" onClick={() => { openDelete(m); setOpenMenuId(null); }}>
                              🗑 Delete
                            </button>
                          </div>
                        )}
                      </div>
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
              <div><strong>Chapter</strong><br /><span style={{ color: "var(--muted)" }}>{panel.lga || "—"}</span></div>
              <div><strong>Expiry</strong><br /><span style={{ color: "var(--muted)" }}>{panel.expiry ? new Date(panel.expiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</span></div>
              <div><strong>Email</strong><br /><span style={{ color: "var(--muted)" }}>{panel.email}</span></div>
              <div><strong>Phone</strong><br /><span style={{ color: "var(--muted)" }}>{panel.phone}</span></div>
              <div><strong>Verified</strong><br /><span style={{ color: "var(--muted)" }}>{panel.isVerified ? "✅ Yes" : "❌ No"}</span></div>
              <div style={{ gridColumn: "1 / -1" }}><strong>Address</strong><br /><span style={{ color: "var(--muted)" }}>{panel.residentialAddress || "—"}</span></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Identity Verification Method</strong><br />
                <span style={{ color: "var(--muted)" }}>
                  {panel.hasNin ? (
                    <>NIN: {panel.nin}</>
                  ) : panel.altIdType ? (
                    <>{panel.altIdType}: {panel.altIdNum || "—"}</>
                  ) : (
                    "Not provided"
                  )}
                </span>
              </div>
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
                      <td style={{ fontSize: 12 }}>{p.payment_type === "registration" ? "Registration" : p.payment_type === "annual_due" ? "Annual Due" : p.payment_type === "annual_developmental_fee" ? "Annual Dev. Fee" : p.payment_type === "renewal" ? "Renewal" : p.payment_type}</td>
                      <td><span className={`badge ${p.status === "confirmed" ? "badge-active" : "badge-pending"}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <h4>Dues Management</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              <div style={{
                padding: 12, borderRadius: "var(--radius-md)", textAlign: "center",
                background: panel.annualDuePaid ? "var(--green-light)" : "var(--bg)",
                border: `1px solid ${panel.annualDuePaid ? "var(--green)" : "var(--border)"}`,
              }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Annual Dues (₦24,000)</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {panel.annualDuePaid
                    ? <>✅ Paid {panel.annualDueYear ? `(${panel.annualDueYear})` : ""}</>
                    : "❌ Not Paid"}
                </div>
              </div>
              <div style={{
                padding: 12, borderRadius: "var(--radius-md)", textAlign: "center",
                background: panel.annualDevelopmentalFeePaid ? "var(--green-light)" : "var(--bg)",
                border: `1px solid ${panel.annualDevelopmentalFeePaid ? "var(--green)" : "var(--border)"}`,
              }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>Dev. Fee (₦50,000)</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {panel.annualDevelopmentalFeePaid
                    ? <>✅ Paid {panel.annualDevelopmentalFeeYear ? `(${panel.annualDevelopmentalFeeYear})` : ""}</>
                    : "❌ Not Paid"}
                </div>
              </div>
            </div>
            <button
              className="btn btn-accent btn-sm"
              style={{ width: "100%", marginBottom: 16 }}
              onClick={() => {
                setDuesTarget(panel);
                setDuesForm({
                  markAnnualDue: !panel.annualDuePaid,
                  markDevelopmentalFee: !panel.annualDevelopmentalFeePaid,
                  developmentalAmount: panel.developmentalLevyAmount ? String(panel.developmentalLevyAmount) : "",
                });
                setShowDuesModal(true);
              }}
            >
              ✏️ Mark Dues as Paid
            </button>

            <h4>Activity Log</h4>
            <ul className="activity-list">
              <li><span className="activity-dot approval" /><div>Registered: {panel.createdAt ? new Date(panel.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div></li>
              {panelPayments.length > 0 && (
                <li><span className="activity-dot payment" /><div>Last payment: ₦{(panelPayments[0].amount_kobo / 100).toLocaleString()} ({panelPayments[0].payment_type === "registration" ? "Registration" : panelPayments[0].payment_type === "annual_due" ? "Annual Due" : panelPayments[0].payment_type === "annual_developmental_fee" ? "Annual Dev. Fee" : panelPayments[0].payment_type === "renewal" ? "Renewal" : panelPayments[0].payment_type})</div></li>
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
                <label>Membership No</label>
                <div style={{
                  padding: "11px 14px", border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)", fontSize: 14,
                  background: "var(--bg)", color: "var(--muted)",
                }}>
                  {editTarget?.mno !== "—" ? editTarget?.mno : "Auto-generated on approval"}
                </div>
              </div>
            </div>
            <hr style={{ borderColor: "var(--border)", margin: "14px 0" }} />
            <h4 style={{ fontSize: 13, marginBottom: 10 }}>Identity Verification</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label>NIN (11 digits)</label>
                <input
                  type="text"
                  value={editForm.nin || ""}
                  onChange={(e) => setEditForm({ ...editForm, nin: e.target.value })}
                  placeholder="e.g. 12345678901"
                  maxLength={11}
                />
              </div>
              <div className="form-group">
                <label>Other ID Type</label>
                <select
                  value={editForm.altIdType || ""}
                  onChange={(e) => setEditForm({ ...editForm, altIdType: e.target.value })}
                >
                  <option value="">— None —</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="International Passport">International Passport</option>
                  <option value="Voter's Card">Voter&apos;s Card</option>
                  <option value="National ID Card">National ID Card</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group">
                <label>Other ID Number</label>
                <input
                  type="text"
                  value={editForm.altIdNum || ""}
                  onChange={(e) => setEditForm({ ...editForm, altIdNum: e.target.value })}
                  placeholder="ID number"
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

      {/* ─── Dues Confirmation Modal ─────────────────────────────────────── */}
      {showDuesModal && duesTarget && (
        <div className="modal-overlay open" onClick={() => { if (!confirmingDues) setShowDuesModal(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setShowDuesModal(false)} disabled={confirmingDues}>✕</button>
            <h3>Mark Dues as Paid</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Member: <strong>{duesTarget.name}</strong> ({duesTarget.mno})
            </p>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={duesForm.markAnnualDue}
                  onChange={(e) => setDuesForm({ ...duesForm, markAnnualDue: e.target.checked })}
                />
                <span>Mark Annual Dues (₦24,000) as paid</span>
              </label>
            </div>

            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={duesForm.markDevelopmentalFee}
                  onChange={(e) => setDuesForm({ ...duesForm, markDevelopmentalFee: e.target.checked })}
                />
                <span>Mark Annual Developmental Fee (₦50,000) as paid</span>
              </label>
            </div>

            {duesForm.markDevelopmentalFee && (
              <div className="form-group">
                <label>Developmental Levy Amount (kobo)</label>
                <input
                  type="number"
                  value={duesForm.developmentalAmount}
                  onChange={(e) => setDuesForm({ ...duesForm, developmentalAmount: e.target.value })}
                  placeholder="e.g. 5000000"
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setShowDuesModal(false)}
                disabled={confirmingDues}
              >
                Cancel
              </button>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={confirmingDues || (!duesForm.markAnnualDue && !duesForm.markDevelopmentalFee)}
                onClick={async () => {
                  setConfirmingDues(true);
                  const res = await api.confirmDues(duesTarget.id, {
                    markAnnualDue: duesForm.markAnnualDue,
                    markDevelopmentalFee: duesForm.markDevelopmentalFee,
                    developmentalAmount: duesForm.developmentalAmount ? parseInt(duesForm.developmentalAmount, 10) : undefined,
                  });
                  setConfirmingDues(false);
                  if (res.error) {
                    showToast(res.error, "error");
                  } else {
                    showToast(res.data?.message || "Dues marked as paid.", "success");
                    setShowDuesModal(false);
                    // Refresh the panel data
                    openPanel(duesTarget);
                  }
                }}
              >
                {confirmingDues ? "Confirming…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Modal ────────────────────────────────────────────────── */}
      {showDelete && deleteTarget && (
        <div className="modal-overlay open" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDelete(false)}>✕</button>
            <h3>Delete Member</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 16 }}>
              This action cannot be undone. All member data including payments, votes, and declarations will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setShowDelete(false); setDeleteTarget(null); }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Password Modal ────────────────────────────────────────── */}
      {showResetPwd && resetPwdTarget && (
        <div className="modal-overlay open" onClick={() => setShowResetPwd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setShowResetPwd(false)}>✕</button>
            <h3>Reset Password</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Member: <strong>{resetPwdTarget.name}</strong> ({resetPwdTarget.email})
            </p>

            {/* Mode selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                className={`btn btn-sm ${resetPwdMode === "email" ? "btn-accent" : "btn-outline"}`}
                style={{ flex: 1 }}
                onClick={() => setResetPwdMode("email")}
              >
                Send Reset Email
              </button>
              <button
                className={`btn btn-sm ${resetPwdMode === "manual" ? "btn-accent" : "btn-outline"}`}
                style={{ flex: 1 }}
                onClick={() => setResetPwdMode("manual")}
              >
                Set New Password
              </button>
            </div>

            {resetPwdMode === "email" ? (
              <>
                <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
                  A password reset link will be sent to <strong>{resetPwdTarget.email}</strong>. The link expires in 1 hour.
                </p>
                <button
                  className="btn btn-accent"
                  style={{ width: "100%" }}
                  disabled={resettingPwd}
                  onClick={handleSendResetEmail}
                >
                  {resettingPwd ? "Sending…" : "Send Reset Email"}
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={resetPwdNewPassword}
                    onChange={(e) => setResetPwdNewPassword(e.target.value)}
                    placeholder="At least 8 characters with a letter and number"
                  />
                </div>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                  The member will be required to change their password on next login.
                </p>
                <button
                  className="btn btn-accent"
                  style={{ width: "100%" }}
                  disabled={resettingPwd || !resetPwdNewPassword}
                  onClick={handleForceResetPassword}
                >
                  {resettingPwd ? "Resetting…" : "Set New Password"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── NIN Verification Modal ──────────────────────────────────────── */}
      {showNinVerify && ninVerifyTarget && (
        <div className="modal-overlay open" onClick={() => { if (!ninVerifying) { setShowNinVerify(false); setNinVerifyResult(null); } }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <button className="modal-close" onClick={() => { setShowNinVerify(false); setNinVerifyResult(null); }} disabled={ninVerifying}>✕</button>
            <h3>NIN Verification</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Member: <strong>{ninVerifyTarget.name}</strong> ({ninVerifyTarget.email})
            </p>

            {!ninVerifyResult ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                {ninVerifying ? (
                  <p style={{ color: "var(--muted)" }}><span className="loader-dot" /> Verifying NIN…</p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: "var(--text)", marginBottom: 16 }}>
                      This will verify the member&apos;s NIN.
                      A wallet charge may apply.
                    </p>
                    <button
                      className="btn btn-accent"
                      style={{ width: "100%" }}
                      onClick={handleVerifyNIN}
                    >
                      Verify NIN Now
                    </button>
                  </>
                )}
              </div>
            ) : ninVerifyResult.verified ? (
              <div>
                <div style={{
                  background: "var(--green-light)", border: "1px solid var(--green)",
                  borderRadius: "var(--radius-md)", padding: 12, marginBottom: 16,
                  textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--green-dark)",
                }}>
                  ✅ {ninVerifyResult.message}
                </div>

                {ninVerifyResult.data?.photo && (
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <img
                      src={`data:image/jpeg;base64,${ninVerifyResult.data.photo}`}
                      alt="NIN Photo"
                      style={{
                        width: 120, height: 120, borderRadius: "50%",
                        objectFit: "cover", border: "2px solid var(--border)",
                      }}
                    />
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div><strong>First Name</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.firstName || "—"}</span></div>
                  <div><strong>Last Name</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.lastName || "—"}</span></div>
                  <div><strong>Middle Name</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.middlename || "—"}</span></div>
                  <div><strong>Date of Birth</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.dateOfBirth || "—"}</span></div>
                  <div><strong>Gender</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.gender || "—"}</span></div>
                  <div><strong>Phone</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.phone || "—"}</span></div>
                  <div><strong>Marital Status</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.maritalStatus || "—"}</span></div>
                  <div><strong>Profession</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.profession || "—"}</span></div>
                  <div><strong>Education</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.educationalLevel || "—"}</span></div>
                  <div><strong>Employment</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.employmentStatus || "—"}</span></div>
                  <div><strong>Religion</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.religion || "—"}</span></div>
                  <div><strong>State of Origin</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.stateOfOrigin || "—"}</span></div>
                  <div style={{ gridColumn: "1 / -1" }}><strong>Address</strong><br /><span style={{ color: "var(--muted)" }}>{ninVerifyResult.data?.address || "—"}</span></div>
                </div>

                {ninVerifyResult.data?.signature && (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <strong style={{ fontSize: 13 }}>Signature</strong><br />
                    <img
                      src={`data:image/jpeg;base64,${ninVerifyResult.data.signature}`}
                      alt="Signature"
                      style={{ height: 40, marginTop: 4, border: "1px solid var(--border)", borderRadius: 4 }}
                    />
                  </div>
                )}

                <button
                  className="btn btn-outline"
                  style={{ width: "100%", marginTop: 16 }}
                  onClick={() => { setShowNinVerify(false); setNinVerifyResult(null); }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: "#fff0f0", border: "1px solid var(--danger)",
                  borderRadius: "var(--radius-md)", padding: 12, marginBottom: 16,
                  textAlign: "center", fontSize: 14, fontWeight: 600, color: "var(--danger)",
                }}>
                  ❌ {ninVerifyResult.message}
                </div>
                <button
                  className="btn btn-outline"
                  style={{ width: "100%" }}
                  onClick={() => { setNinVerifyResult(null); }}
                >
                  Try Again
                </button>
              </div>
            )}
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
