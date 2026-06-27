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
  const [electionForm, setElectionForm] = useState({
    title: "", description: "", startDate: "", endDate: "", eligibleRoles: "",
    declarationStart: "", declarationEnd: "",
    nominationStart: "", nominationEnd: "",
    eligibleVotersReleaseDate: "", screeningDate: "",
    qualifiedCandidatesReleaseDate: "", manifestoDate: "",
    electionDate: "", swearingInDate: "",
  });
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

  // Add Declaration modal (with form type and file upload)
  const [showAddDecl, setShowAddDecl] = useState(false);
  const [addDeclElectionId, setAddDeclElectionId] = useState<string | null>(null);
  const [addDeclPositionId, setAddDeclPositionId] = useState("");
  const [addDeclUserId, setAddDeclUserId] = useState("");
  const [addDeclStatement, setAddDeclStatement] = useState("");
  const [addDeclMemberSearch, setAddDeclMemberSearch] = useState("");
  const [addDeclMembers, setAddDeclMembers] = useState<{ id: string; name: string; email: string; mno: string }[]>([]);
  const [addDeclSaving, setAddDeclSaving] = useState(false);
  // Positions for the current election (for the add declaration dropdown)
  const [addDeclPositions, setAddDeclPositions] = useState<ElectionPosition[]>([]);
  const [addDeclFormType, setAddDeclFormType] = useState<"declaration" | "nomination">("declaration");
  const [addDeclFormFile, setAddDeclFormFile] = useState<File | null>(null);
  // Nominee fields for nomination forms
  const [addDeclNomineeSearch, setAddDeclNomineeSearch] = useState("");
  const [addDeclNomineeMembers, setAddDeclNomineeMembers] = useState<any[]>([]);
  const [addDeclNomineeUserId, setAddDeclNomineeUserId] = useState("");

  // Results
  const [showResults, setShowResults] = useState<string | null>(null);
  const [results, setResults] = useState<ElectionResults | null>(null);

  // Eligible Voters
  const [showVoters, setShowVoters] = useState<string | null>(null);
  const [voters, setVoters] = useState<any[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);

  // ─── Posters ────────────────────────────────────────────────────────────
  const [showPosters, setShowPosters] = useState<string | null>(null);
  const [posterElectionTitle, setPosterElectionTitle] = useState("");
  const [posters, setPosters] = useState<any[]>([]);
  const [postersLoading, setPostersLoading] = useState(false);
  const [posterUploading, setPosterUploading] = useState(false);

  // Action menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-wrapper")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

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
    setElectionForm({
      title: "", description: "", startDate: "", endDate: "", eligibleRoles: "",
      declarationStart: "", declarationEnd: "",
      nominationStart: "", nominationEnd: "",
      eligibleVotersReleaseDate: "", screeningDate: "",
      qualifiedCandidatesReleaseDate: "", manifestoDate: "",
      electionDate: "", swearingInDate: "",
    });
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
      declarationStart: el.declaration_start ? el.declaration_start.slice(0, 16) : "",
      declarationEnd: el.declaration_end ? el.declaration_end.slice(0, 16) : "",
      nominationStart: el.nomination_start ? el.nomination_start.slice(0, 16) : "",
      nominationEnd: el.nomination_end ? el.nomination_end.slice(0, 16) : "",
      eligibleVotersReleaseDate: el.eligible_voters_release_date ? el.eligible_voters_release_date.slice(0, 16) : "",
      screeningDate: el.screening_date ? el.screening_date.slice(0, 16) : "",
      qualifiedCandidatesReleaseDate: el.qualified_candidates_release_date ? el.qualified_candidates_release_date.slice(0, 16) : "",
      manifestoDate: el.manifesto_date ? el.manifesto_date.slice(0, 16) : "",
      electionDate: el.election_date ? el.election_date.slice(0, 16) : "",
      swearingInDate: el.swearing_in_date ? el.swearing_in_date.slice(0, 16) : "",
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
      declarationStart: electionForm.declarationStart ? new Date(electionForm.declarationStart).toISOString() : null,
      declarationEnd: electionForm.declarationEnd ? new Date(electionForm.declarationEnd).toISOString() : null,
      nominationStart: electionForm.nominationStart ? new Date(electionForm.nominationStart).toISOString() : null,
      nominationEnd: electionForm.nominationEnd ? new Date(electionForm.nominationEnd).toISOString() : null,
      eligibleVotersReleaseDate: electionForm.eligibleVotersReleaseDate ? new Date(electionForm.eligibleVotersReleaseDate).toISOString() : null,
      screeningDate: electionForm.screeningDate ? new Date(electionForm.screeningDate).toISOString() : null,
      qualifiedCandidatesReleaseDate: electionForm.qualifiedCandidatesReleaseDate ? new Date(electionForm.qualifiedCandidatesReleaseDate).toISOString() : null,
      manifestoDate: electionForm.manifestoDate ? new Date(electionForm.manifestoDate).toISOString() : null,
      electionDate: electionForm.electionDate ? new Date(electionForm.electionDate).toISOString() : null,
      swearingInDate: electionForm.swearingInDate ? new Date(electionForm.swearingInDate).toISOString() : null,
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

  // ─── Declaration Management ───────────────────────────────────────────────
  function canEditDeclarations(election: Election | null): boolean {
    if (!election) return false;
    // Can edit if: draft/upcoming status, OR declaration_end is in the future or not set
    if (election.status === "draft" || election.status === "upcoming") return true;
    if (election.status === "active" || election.status === "closed") {
      // Check if declaration_end is still in the future or not set
      if (!election.declaration_end) return false;
      return new Date(election.declaration_end) > new Date();
    }
    return false;
  }

  async function deleteDeclaration(id: string) {
    if (!confirm("Delete this declaration? This will also remove the candidate if approved.")) return;
    const res = await api.deleteDeclaration(id);
    if (res.data) {
      showToast("Declaration deleted", "success");
      if (showDeclarations) openDeclarations(showDeclarations);
    } else showToast(res.error || "Failed to delete", "error");
  }

  function openAddDecl(electionId: string, positions: ElectionPosition[]) {
    setAddDeclElectionId(electionId);
    setAddDeclPositions(positions);
    setAddDeclPositionId(positions.length > 0 ? positions[0].id : "");
    setAddDeclUserId("");
    setAddDeclStatement("");
    setAddDeclMemberSearch("");
    setAddDeclMembers([]);
    setAddDeclFormType("declaration");
    setAddDeclFormFile(null);
    setAddDeclNomineeSearch("");
    setAddDeclNomineeMembers([]);
    setAddDeclNomineeUserId("");
    setShowAddDecl(true);
  }

  async function searchAddDeclMembers(query: string) {
    setAddDeclMemberSearch(query);
    setAddDeclUserId(""); // reset selection when searching again
    if (query.length < 2) {
      setAddDeclMembers([]);
      return;
    }
    const res = await api.getMembers();
    if (res.data) {
      const all = res.data.members as any[];
      const q = query.toLowerCase();
      setAddDeclMembers(
        all
          .filter((m: any) =>
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.mno?.toLowerCase().includes(q)
          )
          .slice(0, 20)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            mno: m.mno,
          }))
      );
    }
  }

  async function searchNomineeMembers(query: string) {
    setAddDeclNomineeSearch(query);
    setAddDeclNomineeUserId("");
    if (query.length < 2) {
      setAddDeclNomineeMembers([]);
      return;
    }
    const res = await api.getMembers();
    if (res.data) {
      const all = res.data.members as any[];
      const q = query.toLowerCase();
      setAddDeclNomineeMembers(
        all
          .filter((m: any) =>
            m.name?.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.mno?.toLowerCase().includes(q)
          )
          .slice(0, 20)
          .map((m: any) => ({ id: m.id, name: m.name, email: m.email, mno: m.mno }))
      );
    }
  }

  async function saveAddDecl() {
    if (!addDeclElectionId || !addDeclPositionId || !addDeclUserId) {
      showToast("Select a member and position", "error");
      return;
    }
    if (addDeclFormType === "nomination" && !addDeclNomineeUserId) {
      showToast("Select a nominee for nomination forms", "error");
      return;
    }
    setAddDeclSaving(true);

    // Use FormData for file upload
    const formData = new FormData();
    formData.append("positionId", addDeclPositionId);
    formData.append("userId", addDeclUserId);
    formData.append("formType", addDeclFormType);
    if (addDeclStatement) formData.append("statement", addDeclStatement);
    if (addDeclFormType === "nomination" && addDeclNomineeUserId) {
      formData.append("nomineeUserId", addDeclNomineeUserId);
    }
    if (addDeclFormFile) {
      formData.append("formFile", addDeclFormFile);
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("gkac_token") : null;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

    try {
      const res = await fetch(`${API_BASE}/elections/${addDeclElectionId}/declare-as-admin`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const json = await res.json();
      setAddDeclSaving(false);
      if (res.ok) {
        showToast(json.message || "Form created", "success");
        setShowAddDecl(false);
        if (showDeclarations) openDeclarations(showDeclarations);
      } else {
        showToast(json.error || "Failed to create form", "error");
      }
    } catch (err) {
      setAddDeclSaving(false);
      showToast("Network error", "error");
    }
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  async function openResults(electionId: string) {
    setShowResults(electionId);
    setActiveTab("results");
    const res = await api.getResults(electionId);
    if (res.data) setResults(res.data);
    else showToast(res.error || "Failed to load results", "error");
  }

  // ─── Eligible Voters ─────────────────────────────────────────────────────
  async function openEligibleVoters(electionId: string) {
    setShowVoters(electionId);
    setVotersLoading(true);
    const res = await api.getEligibleVoters(electionId);
    if (res.data) setVoters(res.data.voters);
    else showToast(res.error || "Failed to load voters", "error");
    setVotersLoading(false);
  }

  // ─── Posters ────────────────────────────────────────────────────────────
  async function openPosters(electionId: string, electionTitle: string) {
    setShowPosters(electionId);
    setPosterElectionTitle(electionTitle);
    setPostersLoading(true);
    const res = await api.getPosters(electionId);
    if (res.data) setPosters(res.data.posters);
    else showToast(res.error || "Failed to load posters", "error");
    setPostersLoading(false);
  }

  async function handleUploadPosters(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !showPosters) return;
    const files = Array.from(e.target.files);
    const count = files.length;
    setPosterUploading(true);
    const res = await api.uploadPosters(files, showPosters);
    if (res.data) {
      showToast(`${count} poster${count > 1 ? "s" : ""} uploaded`, "success");
      openPosters(showPosters, posterElectionTitle);
    } else {
      showToast(res.error || "Failed to upload posters", "error");
      setPosterUploading(false);
    }
  }

  async function deletePoster(id: string) {
    if (!confirm("Delete this poster?")) return;
    const res = await api.deletePoster(id);
    if (res.data) {
      showToast("Poster deleted", "success");
      if (showPosters) openPosters(showPosters, posterElectionTitle);
    } else showToast(res.error || "Failed to delete poster", "error");
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
            <p style={{ color: "var(--muted)", padding: 20, textAlign: "center" }}><span className="loader-dot" /></p>
          ) : elections.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: 20 }}>No elections yet. Create your first election to get started.</p>
          ) : (
            <div className="table-scroll-wrap">
              <table className="data-table data-table-elections">
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
                        <div className="dropdown-wrapper">
                          <button
                            className="dropdown-trigger"
                            onClick={() => setOpenMenuId(openMenuId === el.id ? null : el.id)}
                            style={{ fontSize: 18, lineHeight: 1, padding: "4px 10px", border: "none", background: "none", cursor: "pointer" }}
                            title="Actions"
                          >
                            ⋮
                          </button>
                          {openMenuId === el.id && (
                            <div className="dropdown-menu">
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openPositions(el.id); }}>📋 Positions</button>
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openDeclarations(el.id); }}>📄 Declarations</button>
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openPosters(el.id, el.title); }}>🖼️ Posters</button>
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openEligibleVoters(el.id); }}>👥 Voters</button>
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openResults(el.id); }}>📊 Results</button>
                              <div className="dropdown-divider" />
                              {el.status === "draft" && (
                                <button className="dropdown-item accent" onClick={() => { setOpenMenuId(null); updateStatus(el.id, "upcoming"); }}>▶ Set Upcoming</button>
                              )}
                              {el.status === "upcoming" && (
                                <button className="dropdown-item accent" onClick={() => { setOpenMenuId(null); updateStatus(el.id, "active"); }}>▶ Activate</button>
                              )}
                              {el.status === "active" && (
                                <button className="dropdown-item accent" onClick={() => { setOpenMenuId(null); updateStatus(el.id, "closed"); }}>⏹ Close</button>
                              )}
                              <div className="dropdown-divider" />
                              <button className="dropdown-item" onClick={() => { setOpenMenuId(null); openEditElection(el); }}>✏️ Edit</button>
                              <button className="dropdown-item danger" onClick={() => { setOpenMenuId(null); deleteElection(el.id); }}>🗑 Delete</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Declaration Review Section */}
        {showDeclarations && (() => {
          const currentElection = elections.find((el) => el.id === showDeclarations) || null;
          const canEdit = canEditDeclarations(currentElection);
          return (
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-header">
              <h3>Declarations of Interest</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {canEdit && (
                  <button className="btn btn-accent btn-sm" onClick={() => {
                    api.getElection(showDeclarations).then((res) => {
                      if (res.data) openAddDecl(showDeclarations, res.data.election.positions || []);
                    });
                  }}>+ Add Declaration</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDeclarations(null)}>✕ Close</button>
              </div>
            </div>
            {declLoading ? (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: 16 }}><span className="loader-dot" /></p>
            ) : declarations.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No declarations yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Position</th>
                      <th>Form Type</th>
                      <th>Nominee</th>
                      <th>Statement</th>
                      <th>Form File</th>
                      <th>Proof</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declarations.map((d) => {
                      const formUrl = d.form_file_path ? api.getFormDownloadUrl(d.form_file_path) : null;
                      const proofUrl = d.proof_file_path ? api.getFormDownloadUrl(d.proof_file_path) : null;
                      return (
                      <tr key={d.id}>
                        <td>
                          <strong>{d.first_name} {d.last_name}</strong>
                          <br /><span style={{ fontSize: 12, color: "var(--muted)" }}>{d.email}</span>
                        </td>
                        <td>{d.position_title}</td>
                        <td>
                          <span className={`badge ${d.form_type === "nomination" ? "badge-pending" : "badge-active"}`}>
                            {d.form_type === "nomination" ? "📋 Nomination" : "📝 Declaration"}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          {d.form_type === "nomination" ? (
                            d.nominee_first_name ? (
                              <><strong>{d.nominee_first_name} {d.nominee_last_name}</strong><br /><span style={{ fontSize: 11, color: "var(--muted)" }}>{d.nominee_email}</span></>
                            ) : "—"
                          ) : "—"}
                        </td>
                        <td style={{ maxWidth: 150, fontSize: 13 }}>{d.statement || "—"}</td>
                        <td>
                          {formUrl ? (
                            <a
                              href={formUrl}
                              className="btn btn-outline btn-xs"
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Download uploaded form"
                            >
                              📄 View
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          {proofUrl ? (
                            <a
                              href={proofUrl}
                              className="btn btn-outline btn-xs"
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View proof of payment"
                            >
                              💳 View
                            </a>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td><span className={d.status === "approved" ? "badge badge-active" : d.status === "rejected" ? "badge badge-expired" : "badge badge-pending"}>{d.status}</span></td>
                        <td className="actions">
                          {d.status === "pending" && (
                            <>
                              <button className="btn btn-accent btn-xs" onClick={() => approveDeclaration(d.id)}>Approve</button>
                              <button className="btn btn-danger btn-xs" onClick={() => rejectDeclaration(d.id)}>Reject</button>
                            </>
                          )}
                          {d.status !== "pending" && <span style={{ fontSize: 12, color: "var(--muted)" }}>Reviewed</span>}
                          {canEdit && (
                            <button className="btn btn-danger btn-xs" onClick={() => deleteDeclaration(d.id)} title="Delete declaration">
                              🗑
                            </button>
                          )}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          );
        })()}
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

            {/* ═══ ELECTION TIMELINE ═══ */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--accent)" }}>
                📅 Election Timeline (click to expand)
              </summary>
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>🗳 Declaration Starts</label>
                    <input type="datetime-local" value={electionForm.declarationStart} onChange={(e) => setElectionForm((p) => ({ ...p, declarationStart: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>📝 Declaration Ends</label>
                    <input type="datetime-local" value={electionForm.declarationEnd} onChange={(e) => setElectionForm((p) => ({ ...p, declarationEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>📋 Nomination Starts</label>
                    <input type="datetime-local" value={electionForm.nominationStart} onChange={(e) => setElectionForm((p) => ({ ...p, nominationStart: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>📋 Nomination Ends</label>
                    <input type="datetime-local" value={electionForm.nominationEnd} onChange={(e) => setElectionForm((p) => ({ ...p, nominationEnd: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>📋 Eligible Voters List Release Date</label>
                  <input type="datetime-local" value={electionForm.eligibleVotersReleaseDate} onChange={(e) => setElectionForm((p) => ({ ...p, eligibleVotersReleaseDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>🔍 Screening of Candidates</label>
                  <input type="datetime-local" value={electionForm.screeningDate} onChange={(e) => setElectionForm((p) => ({ ...p, screeningDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>✅ Release of Qualified Candidates Names</label>
                  <input type="datetime-local" value={electionForm.qualifiedCandidatesReleaseDate} onChange={(e) => setElectionForm((p) => ({ ...p, qualifiedCandidatesReleaseDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>🎤 Manifestos</label>
                  <input type="datetime-local" value={electionForm.manifestoDate} onChange={(e) => setElectionForm((p) => ({ ...p, manifestoDate: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>🗳 Election Day</label>
                    <input type="datetime-local" value={electionForm.electionDate} onChange={(e) => setElectionForm((p) => ({ ...p, electionDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>🤝 Swearing-In Ceremony</label>
                    <input type="datetime-local" value={electionForm.swearingInDate} onChange={(e) => setElectionForm((p) => ({ ...p, swearingInDate: e.target.value }))} />
                  </div>
                </div>
              </div>
            </details>

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

      {/* ═══ POSTER MANAGEMENT MODAL ═══ */}
      {showPosters && (
        <div className="modal-overlay open" onClick={() => { setShowPosters(null); setPosters([]); }}>
          <div className="modal" style={{ maxWidth: 750 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowPosters(null); setPosters([]); }}>✕</button>
            <h3>📸 Election Posters — {posterElectionTitle}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Upload and manage campaign posters for this election. Supported formats: JPEG, PNG, GIF, WebP (max 10 MB each).
            </p>

            {/* Upload Area */}
            <div
              style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: posterUploading ? 20 : 32,
                textAlign: "center",
                marginBottom: 20,
                cursor: "pointer",
                background: posterUploading ? "var(--green-light)" : "var(--bg)",
                transition: "all 0.2s",
              }}
              onClick={() => document.getElementById("poster-upload-input")?.click()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--green-light)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--bg)"; }}
            >
              {posterUploading ? (
                <div>
                  <span style={{ fontSize: 32 }}>⏳</span>
                  <p style={{ marginTop: 8, fontWeight: 600 }}>Uploading posters…</p>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 40 }}>🖼️</span>
                  <p style={{ marginTop: 8, fontWeight: 600 }}>Click to upload posters</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    JPEG, PNG, GIF, or WebP — max 10 MB each, up to 10 at once
                  </p>
                </div>
              )}
              <input
                id="poster-upload-input"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: "none" }}
                onChange={handleUploadPosters}
                disabled={posterUploading}
              />
            </div>

            {/* Posters Gallery */}
            {postersLoading ? (
              <p style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}><span className="loader-dot" /></p>
            ) : posters.length === 0 ? (
              <div style={{
                textAlign: "center", padding: 40, color: "var(--muted)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
              }}>
                <span style={{ fontSize: 48 }}>📭</span>
                <p style={{ marginTop: 12 }}>No posters uploaded yet. Drop a poster above to get started.</p>
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
                maxHeight: 420,
                overflowY: "auto",
                padding: "4px 0",
              }}>
                {posters.map((poster) => {
                  const posterUrl = api.getPosterUrl(poster.filename);
                  return (
                    <div
                      key={poster.id}
                      style={{
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        position: "relative",
                        aspectRatio: "4 / 3",
                      }}
                    >
                      <img
                        src={posterUrl}
                        alt={poster.title || poster.original_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      {/* Overlay on hover */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.5)",
                          opacity: 0,
                          transition: "opacity 0.2s",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                          padding: 12,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0"; }}
                      >
                        {poster.title && (
                          <span style={{ color: "#fff", fontWeight: 600, fontSize: 13, textAlign: "center" }}>
                            {poster.title}
                          </span>
                        )}
                        <a
                          href={posterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-xs"
                          style={{ background: "rgba(255,255,255,0.9)", color: "#000", border: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          🔍 View
                        </a>
                        <button
                          className="btn btn-danger btn-xs"
                          onClick={() => deletePoster(poster.id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                      {/* Bottom label */}
                      <div style={{
                        position: "absolute",
                        bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                        padding: "8px",
                        fontSize: 11,
                        color: "#fff",
                        textAlign: "center",
                        pointerEvents: "none",
                      }}>
                        {poster.original_name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ELIGIBLE VOTERS MODAL ═══ */}
      {showVoters && (
        <div className="modal-overlay open" onClick={() => { setShowVoters(null); setVoters([]); }}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowVoters(null); setVoters([]); }}>✕</button>
            <h3>🗳️ Eligible Voters</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Members who are approved, not suspended, membership active, and have paid all dues.
            </p>
            {votersLoading ? (
              <p style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}><span className="loader-dot" /></p>
            ) : voters.length === 0 ? (
              <p style={{ color: "var(--muted)", padding: 16 }}>No eligible voters found.</p>
            ) : (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Total: {voters.length} eligible voters</p>
                <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Membership No</th>
                        <th>Category</th>
                        <th>Annual Due</th>
                        <th>Dev. Fee</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voters.map((v: any) => (
                        <tr key={v.id}>
                          <td>
                            <strong>{v.name}</strong>
                            <br /><span style={{ fontSize: 11, color: "var(--muted)" }}>{v.email}</span>
                          </td>
                          <td>{v.membershipCode}</td>
                          <td>{v.category}</td>
                          <td>
                            <span className={`badge ${v.annualDuePaid ? "badge-active" : "badge-expired"}`}>
                              {v.annualDuePaid ? `✅ ${v.annualDueYear || ""}` : "❌"}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${v.developmentalFeePaid ? "badge-active" : "badge-expired"}`}>
                              {v.developmentalFeePaid ? `✅ ${v.developmentalFeeYear || ""}` : "❌"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>{v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    const csv = [["Name","Email","Membership No","Category","Annual Due","Dev Fee","Expires"],
                      ...voters.map((v: any) => [v.name, v.email, v.membershipCode, v.category, v.annualDuePaid ? "Yes" : "No", v.developmentalFeePaid ? "Yes" : "No", v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-GB") : ""])]
                      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `eligible-voters-${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ ADD DECLARATION MODAL (with form type and file upload) ═══ */}
      {showAddDecl && (
        <div className="modal-overlay open" onClick={() => setShowAddDecl(false)}>
          <div className="modal" style={{ maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddDecl(false)}>✕</button>
            <h3>Add Election Form</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
              Add a declaration of interest or nomination form on behalf of a member. Will be auto-approved.
            </p>

            {/* Form Type Selection */}
            <div className="form-group">
              <label>Form Type *</label>
              <select
                value={addDeclFormType}
                onChange={(e) => setAddDeclFormType(e.target.value as "declaration" | "nomination")}
              >
                <option value="declaration">📝 Declaration of Interest</option>
                <option value="nomination">📋 Nomination Form</option>
              </select>
            </div>

            <div className="form-group">
              <label>Search Member *</label>
              <input
                type="text"
                placeholder="Type at least 2 characters to search…"
                value={addDeclMemberSearch}
                onChange={(e) => searchAddDeclMembers(e.target.value)}
              />
              {addDeclMembers.length > 0 && (
                <div style={{
                  marginTop: 4, border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  maxHeight: 200, overflowY: "auto", background: "var(--bg)"
                }}>
                  {addDeclMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setAddDeclUserId(m.id);
                        setAddDeclMemberSearch(`${m.name} (${m.email})`);
                        setAddDeclMembers([]);
                      }}
                      style={{
                        padding: "8px 12px", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid var(--border)", background: addDeclUserId === m.id ? "var(--green-light)" : "transparent",
                      }}
                    >
                      <strong>{m.name}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: 8 }}>{m.email}</span>
                      <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>{m.mno}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nominee search - only for nomination forms */}
            {addDeclFormType === "nomination" && (
              <div className="form-group">
                <label>Nominee (the person being nominated) *</label>
                <input
                  type="text"
                  placeholder="Search for the nominee…"
                  value={addDeclNomineeSearch}
                  onChange={(e) => searchNomineeMembers(e.target.value)}
                />
                {addDeclNomineeMembers.length > 0 && (
                  <div style={{
                    marginTop: 4, border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                    maxHeight: 200, overflowY: "auto", background: "var(--bg)"
                  }}>
                    {addDeclNomineeMembers.map((m: any) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setAddDeclNomineeUserId(m.id);
                          setAddDeclNomineeSearch(`${m.name} (${m.email})`);
                          setAddDeclNomineeMembers([]);
                        }}
                        style={{
                          padding: "8px 12px", cursor: "pointer", fontSize: 13,
                          borderBottom: "1px solid var(--border)", background: addDeclNomineeUserId === m.id ? "var(--green-light)" : "transparent",
                        }}
                      >
                        <strong>{m.name}</strong>
                        <span style={{ color: "var(--muted)", marginLeft: 8 }}>{m.email}</span>
                        <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: 11 }}>{m.mno}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Position *</label>
              <select value={addDeclPositionId} onChange={(e) => setAddDeclPositionId(e.target.value)}>
                {addDeclPositions.length === 0 ? (
                  <option value="">No positions available</option>
                ) : (
                  addDeclPositions.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Statement (optional)</label>
              <textarea
                rows={2}
                value={addDeclStatement}
                onChange={(e) => setAddDeclStatement(e.target.value)}
                placeholder="Optional statement…"
              />
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label>Upload Form File (optional)</label>
              <div style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                textAlign: "center",
                background: addDeclFormFile ? "var(--green-light)" : "var(--bg)",
                cursor: "pointer",
              }}
                onClick={() => document.getElementById("admin-decl-file-input")?.click()}
              >
                {addDeclFormFile ? (
                  <div>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}><strong>{addDeclFormFile.name}</strong></p>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setAddDeclFormFile(null); }}
                    >Remove</button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 24 }}>📄</span>
                    <p style={{ margin: "4px 0", fontSize: 12, color: "var(--muted)" }}>Click to select form file (optional)</p>
                  </div>
                )}
                <input
                  id="admin-decl-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAddDeclFormFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-accent"
                style={{ flex: 1 }}
                disabled={addDeclSaving || !addDeclUserId || !addDeclPositionId || (addDeclFormType === "nomination" && !addDeclNomineeUserId)}
                onClick={saveAddDecl}
              >
                {addDeclSaving ? "Saving…" : "Add Form"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowAddDecl(false)}>Cancel</button>
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
