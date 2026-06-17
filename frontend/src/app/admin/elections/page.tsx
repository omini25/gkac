"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Election, type ElectionDetail, type ElectionPosition, type ElectionDeclaration, type ElectionResults } from "@/lib/api";

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });

  // Modals
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [editingElection, setEditingElection] = useState<Election | null>(null);
  const [electionForm, setElectionForm] = useState({ title: "", description: "", startDate: "", endDate: "", eligibleRoles: "" });
  const [electionPositions, setElectionPositions] = useState<{ title: string; description: string }[]>([]);
  const [activePositionIdx, setActivePositionIdx] = useState<number | null>(null);

  // Standalone Positions modal (for post-creation)
  const [showPositions, setShowPositions] = useState<string | null>(null);
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [positionForm, setPositionForm] = useState({ title: "", description: "", maxCandidates: "1" });
  const [editingPosition, setEditingPosition] = useState<ElectionPosition | null>(null);

  // Declarations
  const [activeTab, setActiveTab] = useState("elections");
  const [showDeclarations, setShowDeclarations] = useState<string | null>(null);
  const [declarations, setDeclarations] = useState<ElectionDeclaration[]>([]);
  const [declLoading, setDeclLoading] = useState(false);

  // Results
  const [showResults, setShowResults] = useState<string | null>(null);
  const [results, setResults] = useState<ElectionResults | null>(null);

  // Detail view
  const [selectedElection, setSelectedElection] = useState<ElectionDetail | null>(null);

  const showToast = useCallback((msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }, []);

  const loadElections = useCallback(async () => {
    setLoading(true);
    const res = await api.getElections();
    if (res.data) setElections(res.data.elections);
    else showToast(res.error || "Failed to load elections", "error");
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadElections(); }, [loadElections]);

  // ─── Election CRUD ───────────────────────────────────────────────────────
  function openCreateElection() {
    setEditingElection(null);
    setElectionForm({ title: "", description: "", startDate: "", endDate: "", eligibleRoles: "" });
    setElectionPositions([]);
    setActivePositionIdx(null);
    setShowElectionModal(true);
  }

  function openEditElection(el: Election) {
    setEditingElection(el);
    setElectionForm({
      title: el.title,
      description: el.description || "",
      startDate: el.start_date ? el.start_date.slice(0, 16) : "",
      endDate: el.end_date ? el.end_date.slice(0, 16) : "",
      eligibleRoles: (el.eligible_roles || []).join(", "),
    });
    setElectionPositions([]);
    setActivePositionIdx(null);
    // Load existing positions for this election
    api.getElection(el.id).then((res) => {
      if (res.data) {
        setElectionPositions(
          (res.data.election.positions || []).map((p) => ({
            title: p.title,
            description: p.description || "",
          }))
        );
      }
    });
    setShowElectionModal(true);
  }

  function addPositionField() {
    setElectionPositions((prev) => [...prev, { title: "", description: "" }]);
    setActivePositionIdx(electionPositions.length);
  }

  function removePositionField(idx: number) {
    setElectionPositions((prev) => prev.filter((_, i) => i !== idx));
    setActivePositionIdx(null);
  }

  function updatePositionField(idx: number, field: "title" | "description", value: string) {
    setElectionPositions((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  async function saveElection() {
    if (!electionForm.title.trim()) { showToast("Title is required", "error"); return; }
    const data: Record<string, unknown> = {
      title: electionForm.title.trim(),
      description: electionForm.description.trim() || null,
      startDate: electionForm.startDate ? new Date(electionForm.startDate).toISOString() : null,
      endDate: electionForm.endDate ? new Date(electionForm.endDate).toISOString() : null,
      eligibleRoles: electionForm.eligibleRoles ? electionForm.eligibleRoles.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    };

    const res = editingElection
      ? await api.updateElection(editingElection.id, data)
      : await api.createElection(data);

    if (res.data) {
      const electionId = res.data.election.id;

      // Create positions if any were added in the form
      if (!editingElection) {
        // New election — create all positions
        for (const pos of electionPositions) {
          if (pos.title.trim()) {
            await api.createPosition(electionId, {
              title: pos.title.trim(),
              description: pos.description.trim() || null,
              maxCandidates: 1,
            });
          }
        }
      } else {
        // Editing — add any new positions that don't exist yet
        const existingRes = await api.getElection(electionId);
        const existingCount = existingRes.data?.election.positions?.length || 0;
        for (let i = existingCount; i < electionPositions.length; i++) {
          const pos = electionPositions[i];
          if (pos.title.trim()) {
            await api.createPosition(electionId, {
              title: pos.title.trim(),
              description: pos.description.trim() || null,
              maxCandidates: 1,
            });
          }
        }
      }

      showToast(editingElection ? "Election updated" : "Election created", "success");
      setShowElectionModal(false);
      loadElections();
    } else {
      showToast(res.error || "Failed to save election", "error");
    }
  }

  async function deleteElection(id: string) {
    if (!confirm("Delete this election and all associated data?")) return;
    const res = await api.deleteElection(id);
    if (res.data) { showToast("Election deleted", "success"); loadElections(); }
    else showToast(res.error || "Failed to delete", "error");
  }

  async function updateStatus(id: string, status: string) {
    const res = await api.updateElectionStatus(id, status);
    if (res.data) { showToast(`Election ${status}`, "success"); loadElections(); }
    else showToast(res.error || "Failed to update status", "error");
  }

  // ─── Positions ───────────────────────────────────────────────────────────
  async function openPositions(electionId: string) {
    setShowPositions(electionId);
    const res = await api.getElection(electionId);
    if (res.data) {
      setPositions(res.data.election.positions || []);
      setSelectedElection(res.data.election);
    }
  }

  async function savePosition() {
    if (!positionForm.title.trim()) { showToast("Position title is required", "error"); return; }
    if (!showPositions) return;

    const data: Record<string, unknown> = {
      title: positionForm.title.trim(),
      description: positionForm.description.trim() || null,
      maxCandidates: parseInt(positionForm.maxCandidates) || 1,
    };

    const res = editingPosition
      ? await api.updatePosition(editingPosition.id, data)
      : await api.createPosition(showPositions, data);

    if (res.data) {
      showToast(editingPosition ? "Position updated" : "Position created", "success");
      setPositionForm({ title: "", description: "", maxCandidates: "1" });
      setEditingPosition(null);
      openPositions(showPositions);
    } else {
      showToast(res.error || "Failed to save position", "error");
    }
  }

  function openEditPosition(pos: ElectionPosition) {
    setEditingPosition(pos);
    setPositionForm({
      title: pos.title,
      description: pos.description || "",
      maxCandidates: String(pos.max_candidates),
    });
  }

  async function deletePosition(id: string) {
    if (!confirm("Delete this position?")) return;
    const res = await api.deletePosition(id);
    if (res.data) {
      showToast("Position deleted", "success");
      if (showPositions) openPositions(showPositions);
    } else showToast(res.error || "Failed to delete", "error");
  }

  // ─── Declarations ────────────────────────────────────────────────────────
  async function openDeclarations(electionId: string) {
    setShowDeclarations(electionId);
    setDeclLoading(true);
    const res = await api.getDeclarations(electionId);
    if (res.data) setDeclarations(res.data.declarations);
    else showToast(res.error || "Failed to load declarations", "error");
    setDeclLoading(false);
  }

  async function approveDeclaration(id: string) {
    const res = await api.approveDeclaration(id);
    if (res.data) {
      showToast("Declaration approved", "success");
      if (showDeclarations) openDeclarations(showDeclarations);
    } else showToast(res.error || "Failed to approve", "error");
  }

  async function rejectDeclaration(id: string) {
    const res = await api.rejectDeclaration(id);
    if (res.data) {
      showToast("Declaration rejected", "success");
      if (showDeclarations) openDeclarations(showDeclarations);
    } else showToast(res.error || "Failed to reject", "error");
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  async function openResults(electionId: string) {
    setShowResults(electionId);
    setActiveTab("results");
    const res = await api.getResults(electionId);
    if (res.data) setResults(res.data);
    else showToast(res.error || "Failed to load results", "error");
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function statusBadge(status: string) {
    const map: Record<string, string> = {
      draft: "badge badge-expired",
      upcoming: "badge badge-pending",
      active: "badge badge-active",
      closed: "badge badge-expired",
    };
    return map[status] || "badge";
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === "elections" ? " active" : ""}`} onClick={() => setActiveTab("elections")}>Elections</button>
        <button className={`tab-btn${activeTab === "results" ? " active" : ""}`} onClick={() => setActiveTab("results")}>Live Results</button>
      </div>

      {/* ═══ ELECTIONS LIST ═══ */}
      <div className={`tab-panel${activeTab === "elections" ? " active" : ""}`}>
        <div className="card">
          <div className="card-header">
            <h3>All Elections</h3>
            <button className="btn btn-accent btn-sm" onClick={openCreateElection}>+ Create Election</button>
          </div>

          {loading ? (
            <p style={{ color: "var(--muted)", padding: 20 }}>Loading…</p>
          ) : elections.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: 20 }}>No elections yet. Create your first election to get started.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Election</th>
                    <th>Period</th>
                    <th>Positions</th>
                    <th>Turnout</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {elections.map((el) => (
                    <tr key={el.id}>
                      <td style={{ fontWeight: 600 }}>{el.title}</td>
                      <td style={{ fontSize: 13, color: "var(--muted)" }}>
                        {formatDate(el.start_date)} – {formatDate(el.end_date)}
                      </td>
                      <td>{el.positions_count}</td>
                      <td>
                        {el.total_votes > 0
                          ? `${el.total_votes} / ${el.eligible_voters} (${el.eligible_voters > 0 ? Math.round((el.total_votes / el.eligible_voters) * 100) : 0}%)`
                          : "—"}
                      </td>
                      <td><span className={statusBadge(el.status)}>{el.status}</span></td>
                      <td className="actions">
                        <button className="btn btn-outline btn-xs" onClick={() => openPositions(el.id)}>Positions</button>
                        <button className="btn btn-outline btn-xs" onClick={() => openDeclarations(el.id)}>Declarations</button>
                        <button className="btn btn-outline btn-xs" onClick={() => openResults(el.id)}>Results</button>
                        {el.status === "draft" && (
                          <button className="btn btn-accent btn-xs" onClick={() => updateStatus(el.id, "upcoming")}>Set Upcoming</button>
                        )}
                        {el.status === "upcoming" && (
                          <button className="btn btn-accent btn-xs" onClick={() => updateStatus(el.id, "active")}>Activate</button>
                        )}
                        {el.status === "active" && (
                          <button className="btn btn-danger btn-xs" onClick={() => updateStatus(el.id, "closed")}>Close</button>
                        )}
                        <button className="btn btn-ghost btn-xs" onClick={() => openEditElection(el)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteElection(el.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Declaration Review Section */}
        {showDeclarations && (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3>Declarations of Interest</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDeclarations(null)}>✕ Close</button>
            </div>
            {declLoading ? (
              <p style={{ color: "var(--muted)" }}>Loading…</p>
            ) : declarations.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No declarations yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Position</th>
                      <th>Category</th>
                      <th>Statement</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.first_name} {d.last_name}</strong>
                          <br /><span style={{ fontSize: 12, color: "var(--muted)" }}>{d.email}</span>
                        </td>
                        <td>{d.position_title}</td>
                        <td style={{ fontSize: 13 }}>{d.membership_category_name}</td>
                        <td style={{ maxWidth: 200, fontSize: 13 }}>{d.statement || "—"}</td>
                        <td><span className={d.status === "approved" ? "badge badge-active" : d.status === "rejected" ? "badge badge-expired" : "badge badge-pending"}>{d.status}</span></td>
                        <td className="actions">
                          {d.status === "pending" && (
                            <>
                              <button className="btn btn-accent btn-xs" onClick={() => approveDeclaration(d.id)}>Approve</button>
                              <button className="btn btn-danger btn-xs" onClick={() => rejectDeclaration(d.id)}>Reject</button>
                            </>
                          )}
                          {d.status !== "pending" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Reviewed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ LIVE RESULTS ═══ */}
      <div className={`tab-panel${activeTab === "results" ? " active" : ""}`}>
        {!showResults || !results ? (
          <div className="card">
            <div className="card-header"><h3>Election Results</h3></div>
            <p style={{ color: "var(--muted)" }}>Click "Results" on any election to view live results.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {elections.filter((e) => e.status === "active" || e.status === "closed" || e.status === "upcoming").map((el) => (
                <button key={el.id} className="btn btn-outline" style={{ justifyContent: "flex-start" }} onClick={() => openResults(el.id)}>
                  🗳 {el.title} <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>({el.status})</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResultsView results={results} onClose={() => { setShowResults(null); setResults(null); }} />
        )}
      </div>

      {/* ═══ POSITIONS MODAL ═══ */}
      {showPositions && (
        <div className="modal-overlay open" onClick={() => { setShowPositions(null); setEditingPosition(null); setPositionForm({ title: "", description: "", maxCandidates: "1" }); }}>
          <div className="modal" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowPositions(null); setEditingPosition(null); setPositionForm({ title: "", description: "", maxCandidates: "1" }); }}>✕</button>
            <h3>Positions — {selectedElection?.title || ""}</h3>

            {/* Add/Edit Position */}
            <div style={{ background: "var(--bg)", padding: 16, borderRadius: "var(--radius-md)", marginBottom: 16 }}>
              <h4 style={{ fontSize: 15, marginBottom: 12 }}>{editingPosition ? "Edit Position" : "Add Position"}</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Title *</label>
                  <input value={positionForm.title} onChange={(e) => setPositionForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. President" />
                </div>
                <div className="form-group">
                  <label>Max Seats</label>
                  <input type="number" min="1" value={positionForm.maxCandidates} onChange={(e) => setPositionForm((p) => ({ ...p, maxCandidates: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={positionForm.description} onChange={(e) => setPositionForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-accent btn-sm" onClick={savePosition}>
                  {editingPosition ? "Update" : "Add"} Position
                </button>
                {editingPosition && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPosition(null); setPositionForm({ title: "", description: "", maxCandidates: "1" }); }}>Cancel</button>
                )}
              </div>
            </div>

            {/* Position List */}
            {positions.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No positions yet. Add positions above.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Title</th><th>Description</th><th>Seats</th><th>Candidates</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr key={pos.id}>
                      <td style={{ fontWeight: 600 }}>{pos.title}</td>
                      <td style={{ fontSize: 13, color: "var(--muted)" }}>{pos.description || "—"}</td>
                      <td>{pos.max_candidates}</td>
                      <td>{pos.candidates_count || 0}</td>
                      <td className="actions">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEditPosition(pos)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deletePosition(pos.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ CREATE/EDIT ELECTION MODAL ═══ */}
      {showElectionModal && (
        <div className="modal-overlay open" onClick={() => setShowElectionModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowElectionModal(false)}>✕</button>
            <h3>{editingElection ? "Edit Election" : "Create Election"}</h3>

            <div className="form-group">
              <label>Title *</label>
              <input value={electionForm.title} onChange={(e) => setElectionForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. GKAC Executive Committee Elections 2025" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={electionForm.description} onChange={(e) => setElectionForm((p) => ({ ...p, description: e.target.value }))} placeholder="Describe the election purpose" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input type="datetime-local" value={electionForm.startDate} onChange={(e) => setElectionForm((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="datetime-local" value={electionForm.endDate} onChange={(e) => setElectionForm((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Eligible Roles (comma-separated)</label>
              <input value={electionForm.eligibleRoles} onChange={(e) => setElectionForm((p) => ({ ...p, eligibleRoles: e.target.value }))} placeholder="e.g. Fellow, Full Member" />
              <span className="form-hint">Leave empty to allow all approved members.</span>
            </div>

            {/* ── Positions (inline) ── */}
            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Positions / Roles</label>
                <button type="button" className="btn btn-accent btn-xs" onClick={addPositionField}>+ Add Position</button>
              </div>

              {electionPositions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>
                  No positions added yet. Click "Add Position" to define the roles members can contest.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {electionPositions.map((pos, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        padding: 10,
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        background: activePositionIdx === idx ? "var(--green-light)" : "transparent",
                      }}
                      onClick={() => setActivePositionIdx(idx)}
                    >
                      <div style={{ flex: 1 }}>
                        <input
                          value={pos.title}
                          onChange={(e) => updatePositionField(idx, "title", e.target.value)}
                          placeholder="Position title (e.g. President)"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 14,
                            fontFamily: "var(--font-body)",
                            marginBottom: 4,
                          }}
                        />
                        <input
                          value={pos.description}
                          onChange={(e) => updatePositionField(idx, "description", e.target.value)}
                          placeholder="Brief description (optional)"
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 13,
                            fontFamily: "var(--font-body)",
                            color: "var(--muted)",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        style={{ marginTop: 2, flexShrink: 0 }}
                        onClick={() => removePositionField(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {electionPositions.length > 0 && (
                <span className="form-hint" style={{ marginTop: 6, display: "block" }}>
                  {electionPositions.filter((p) => p.title.trim()).length} position(s) with titles
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <button className="btn btn-accent" onClick={saveElection}>
                {editingElection ? "Update Election" : "Create Election"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowElectionModal(false)}>Cancel</button>
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

// ─── Results View Component ─────────────────────────────────────────────
function ResultsView({ results, onClose }: { results: ElectionResults; onClose: () => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 style={{ marginBottom: 4 }}>{results.election.title}</h3>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {results.election.startDate && results.election.endDate
              ? `${new Date(results.election.startDate).toLocaleDateString()} – ${new Date(results.election.endDate).toLocaleDateString()}`
              : ""}
            {" · "}
            <span style={{
              color: results.election.status === "active" ? "var(--success)" : results.election.status === "closed" ? "var(--muted)" : "var(--warn)",
              fontWeight: 700
            }}>
              {results.election.status.toUpperCase()}
            </span>
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
      </div>

      {/* Turnout Summary */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 28 }}>{results.summary.eligibleVoters}</div>
          <div className="stat-label">Eligible Voters</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 28, color: "var(--success)" }}>{results.summary.totalVoters}</div>
          <div className="stat-label">Votes Cast</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 28 }}>{results.summary.turnout}%</div>
          <div className="stat-label">Turnout</div>
          <div className="progress-bar" style={{ marginTop: 8 }}>
            <div className="fill" style={{ width: `${results.summary.turnout}%` }} />
          </div>
        </div>
      </div>

      {/* Positions Results */}
      {results.positions.map((pos) => {
        const totalVotes = pos.totalVotes;
        const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
        const winner = sorted[0];

        return (
          <div key={pos.id} style={{ marginBottom: 24, borderBottom: "1px solid var(--border)", paddingBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ fontSize: 17, marginBottom: 0 }}>{pos.title}</h4>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</span>
            </div>

            {pos.candidates.length === 0 ? (
              <p style={{ fontSize: 14, color: "var(--muted)" }}>No candidates for this position.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sorted.map((c) => {
                  const isWinner = winner && c.id === winner.id && totalVotes > 0;
                  return (
                    <div
                      key={c.id}
                      style={{
                        padding: "12px 16px",
                        border: `1px solid ${isWinner ? "var(--green)" : "var(--border)"}`,
                        borderRadius: "var(--radius-md)",
                        background: isWinner ? "var(--green-light)" : "var(--surface)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div>
                          <strong>{c.firstName} {c.lastName}</strong>
                          {isWinner && results.election.status === "closed" && (
                            <span className="badge badge-active" style={{ marginLeft: 8 }}>Winner</span>
                          )}
                          {isWinner && results.election.status === "active" && (
                            <span className="badge badge-active" style={{ marginLeft: 8 }}>Leading</span>
                          )}
                          <br />
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.membershipCategory} · {c.membershipCode}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green-dark)", lineHeight: 1 }}>{c.voteCount}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.percentage}%</div>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className="fill" style={{ width: `${c.percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
