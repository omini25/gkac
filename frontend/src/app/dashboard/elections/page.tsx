"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Election, type ElectionPosition, type ElectionCandidate, type ElectionDeclaration, type ElectionResults } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";

export default function ElectionsPage() {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [candidates, setCandidates] = useState<ElectionCandidate[]>([]);
  const [myDeclarations, setMyDeclarations] = useState<ElectionDeclaration[]>([]);
  const [votedPositions, setVotedPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "" });
  const [activeTab, setActiveTab] = useState("active");

  // Ballot modal
  const [ballotElection, setBallotElection] = useState<Election | null>(null);
  const [ballotPositions, setBallotPositions] = useState<ElectionPosition[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Declaration modal (with form upload + payment proof)
  const [declareElection, setDeclareElection] = useState<Election | null>(null);
  const [declarePositions, setDeclarePositions] = useState<ElectionPosition[]>([]);
  const [declarePositionId, setDeclarePositionId] = useState("");
  const [declareStatement, setDeclareStatement] = useState("");
  const [declareFormFile, setDeclareFormFile] = useState<File | null>(null);
  const [declareProofFile, setDeclareProofFile] = useState<File | null>(null);
  const [declaring, setDeclaring] = useState(false);

  // Nomination modal (nominate another member with form upload + payment proof)
  const [nominateElection, setNominateElection] = useState<Election | null>(null);
  const [nominatePositions, setNominatePositions] = useState<ElectionPosition[]>([]);
  const [nominatePositionId, setNominatePositionId] = useState("");
  const [nominateStatement, setNominateStatement] = useState("");
  const [nominateFormFile, setNominateFormFile] = useState<File | null>(null);
  const [nominateProofFile, setNominateProofFile] = useState<File | null>(null);
  const [nominating, setNominating] = useState(false);
  const [nominationFee, setNominationFee] = useState(50000);
  // Nominee search for nomination
  const [nomineeSearch, setNomineeSearch] = useState("");
  const [nomineeResults, setNomineeResults] = useState<{ id: string; name: string; email: string; mno: string }[]>([]);
  const [nomineeUserId, setNomineeUserId] = useState("");

  // Results modal
  const [results, setResults] = useState<ElectionResults | null>(null);

  const showToast = useCallback((msg: string, type: string) => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 3500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const elRes = await api.getElections();
    if (elRes.data) setElections(elRes.data.elections);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function loadVoteState(electionId: string) {
    const [candRes, declRes, votedRes] = await Promise.all([
      api.getCandidates(electionId),
      api.getMyDeclarations(electionId),
      api.hasVoted(electionId),
    ]);
    if (candRes.data) setCandidates(candRes.data.candidates);
    if (declRes.data) setMyDeclarations(declRes.data.declarations);
    if (votedRes.data) setVotedPositions(votedRes.data.votedPositions);
  }

  // ─── Vote ────────────────────────────────────────────────────────────────
  async function openBallot(el: Election) {
    setBallotElection(el);
    setSelections({});
    const res = await api.getElection(el.id);
    if (res.data) {
      setBallotPositions(res.data.election.positions || []);
    }
    await loadVoteState(el.id);
  }

  async function submitVote() {
    if (!ballotElection) return;
    setSubmitting(true);

    const votes = Object.entries(selections).map(([positionId, candidateId]) => ({
      positionId,
      candidateId,
    }));

    if (votes.length === 0) {
      showToast("Please select at least one candidate.", "error");
      setSubmitting(false);
      return;
    }

    const res = await api.castVote(ballotElection.id, votes);
    if (res.data) {
      showToast("Your vote has been submitted successfully!", "success");
      setBallotElection(null);
      await loadVoteState(ballotElection.id);
    } else {
      showToast(res.error || "Failed to submit vote", "error");
    }
    setSubmitting(false);
  }

  // ─── Declare Interest (with form upload + payment proof) ────────────────
  async function submitDeclaration() {
    if (!declareElection || !declarePositionId) return;
    if (!declareFormFile) {
      showToast("Please upload your completed declaration form.", "error");
      return;
    }
    if (!declareProofFile) {
      showToast("Please upload your proof of payment.", "error");
      return;
    }
    setDeclaring(true);
    const res = await api.submitDeclarationForm(
      declareElection.id,
      declarePositionId,
      declareFormFile,
      declareProofFile,
      declareStatement || undefined
    );
    if (res.data) {
      showToast("Declaration form submitted! Awaiting admin approval.", "success");
      setDeclareElection(null);
      setDeclarePositionId("");
      setDeclareStatement("");
      setDeclareFormFile(null);
      setDeclareProofFile(null);
      await loadVoteState(declareElection.id);
    } else {
      showToast(res.error || "Failed to submit declaration", "error");
    }
    setDeclaring(false);
  }

  // ─── Nomination Form (nominate another member with form upload) ─────────
  async function searchNomineeMembers(query: string) {
    setNomineeSearch(query);
    setNomineeUserId("");
    if (query.length < 2) {
      setNomineeResults([]);
      return;
    }
    const res = await api.searchMembers(query);
    if (res.data) {
      setNomineeResults(res.data.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        mno: m.mno,
      })));
    }
  }

  async function submitNomination() {
    if (!nominateElection || !nominatePositionId || !nomineeUserId) {
      showToast("Please select a position and nominee.", "error");
      return;
    }
    if (!nominateFormFile) {
      showToast("Please upload the completed nomination form.", "error");
      return;
    }
    if (!nominateProofFile) {
      showToast("Please upload your proof of payment.", "error");
      return;
    }
    setNominating(true);
    const res = await api.submitNominationForm(
      nominateElection.id,
      nominatePositionId,
      nomineeUserId,
      nominateFormFile,
      nominateProofFile,
      nominateStatement || undefined
    );
    setNominating(false);
    if (res.data) {
      showToast("Nomination form submitted! Awaiting admin approval.", "success");
      setNominateElection(null);
      setNominatePositionId("");
      setNominateStatement("");
      setNominateFormFile(null);
      setNominateProofFile(null);
      setNomineeSearch("");
      setNomineeResults([]);
      setNomineeUserId("");
    } else {
      showToast(res.error || "Failed to submit nomination", "error");
    }
  }

  // ─── Results ─────────────────────────────────────────────────────────────
  async function openResults(electionId: string) {
    const res = await api.getResults(electionId);
    if (res.data) setResults(res.data);
    else showToast(res.error || "Failed to load results", "error");
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const activeElections = elections.filter((e) => e.status === "active");
  const upcomingElections = elections.filter((e) => e.status === "upcoming" || e.status === "draft");
  const pastElections = elections.filter((e) => e.status === "closed");

  function formatDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function declaredForPosition(positionId: string): ElectionDeclaration | undefined {
    return myDeclarations.find((d) => d.position_id === positionId);
  }

  function getCandidatesForPosition(positionId: string): ElectionCandidate[] {
    return candidates.filter((c) => c.position_id === positionId);
  }

  return (
    <>
      {/* Quick actions: Election Forms */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 15 }}>📋 Election Forms</strong>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Download, fill, and upload your Declaration of Interest or Nomination Form for the upcoming election.
            </p>
          </div>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Use the "Declare Interest" and "Nomination Form" buttons below when a declaration/nomination period is open.
          </span>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn${activeTab === "active" ? " active" : ""}`} onClick={() => setActiveTab("active")}>
          Active {activeElections.length > 0 && `(${activeElections.length})`}
        </button>
        <button className={`tab-btn${activeTab === "upcoming" ? " active" : ""}`} onClick={() => setActiveTab("upcoming")}>
          Upcoming
        </button>
        <button className={`tab-btn${activeTab === "past" ? " active" : ""}`} onClick={() => setActiveTab("past")}>
          Past Results
        </button>
      </div>

      {/* ═══ ACTIVE ELECTIONS ═══ */}
      <div className={`tab-panel${activeTab === "active" ? " active" : ""}`}>
        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading elections…</p>
        ) : activeElections.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>No active elections right now. Check back when voting opens.</p>
          </div>
        ) : (
          activeElections.map((el) => (
            <ElectionCard
              key={el.id}
              election={el}
              onVote={() => openBallot(el)}
              onViewResults={() => openResults(el.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* ═══ UPCOMING ELECTIONS ═══ */}
      <div className={`tab-panel${activeTab === "upcoming" ? " active" : ""}`}>
        {upcomingElections.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>No upcoming elections scheduled.</p>
          </div>
        ) : (
          upcomingElections.map((el) => {
            const now = new Date();
            const declStart = el.declaration_start ? new Date(el.declaration_start) : null;
            const declEnd = el.declaration_end ? new Date(el.declaration_end) : null;
            const isDeclarationOpen = declStart && declEnd && now >= declStart && now <= declEnd;
            const nomStart = el.nomination_start ? new Date(el.nomination_start) : null;
            const nomEnd = el.nomination_end ? new Date(el.nomination_end) : null;
            const isNominationOpen = nomStart && nomEnd && now >= nomStart && now <= nomEnd;

            return (
            <div key={el.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <strong style={{ fontSize: 16, flex: 1, wordBreak: "break-word" }}>{el.title}</strong>
                  <span className="status-badge status-pending" style={{ flexShrink: 0 }}>{el.status === "draft" ? "Draft" : "Upcoming"}</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{el.description || ""}</span>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  {el.start_date && (
                    <div style={{ color: "var(--muted)" }}>
                      🗓 Voting opens: {formatDate(el.start_date)}
                    </div>
                  )}
                  {declStart && declEnd && (
                    <div style={{ color: isDeclarationOpen ? "var(--accent)" : "var(--muted)" }}>
                      📝 Declaration: {formatDate(declStart.toISOString())} – {formatDate(declEnd.toISOString())}
                      {isDeclarationOpen && <span className="badge badge-active" style={{ marginLeft: 6 }}>Open</span>}
                    </div>
                  )}
                  {nomStart && nomEnd && (
                    <div style={{ color: isNominationOpen ? "var(--accent)" : "var(--muted)" }}>
                      📋 Nomination: {formatDate(nomStart.toISOString())} – {formatDate(nomEnd.toISOString())}
                      {isNominationOpen && <span className="badge badge-active" style={{ marginLeft: 6 }}>Open</span>}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {myDeclarations.length > 0 && (
                  <div style={{ width: "100%", fontSize: 13, marginBottom: 4 }}>
                    <strong>My Declarations:</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                      {myDeclarations.map((d) => (
                        <li key={d.id}>
                          {d.position_title || ""} — <span className={d.status === "approved" ? "badge badge-active" : d.status === "rejected" ? "badge badge-expired" : "badge badge-pending"}>{d.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {isDeclarationOpen && (
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={async () => {
                      setDeclareElection(el);
                      setDeclarePositionId("");
                      setDeclareStatement("");
                      const posRes = await api.getElection(el.id);
                      if (posRes.data) {
                        setDeclarePositions(posRes.data.election.positions || []);
                      }
                      await loadVoteState(el.id);
                    }}
                  >
                    📝 Declare Interest
                  </button>
                )}
                {isNominationOpen && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={async () => {
                      setNominateElection(el);
                      setNominatePositionId("");
                      setNominateStatement("");
                      setNominateFormFile(null);
                      setNomineeSearch("");
                      setNomineeResults([]);
                      setNomineeUserId("");
                      const posRes = await api.getElection(el.id);
                      if (posRes.data) {
                        setNominatePositions(posRes.data.election.positions || []);
                      }
                    }}
                  >
                    📋 Nomination Form
                  </button>
                )}
              </div>

            </div>
            );
          })
        )}
      </div>

      {/* ═══ PAST ELECTIONS ═══ */}
      <div className={`tab-panel${activeTab === "past" ? " active" : ""}`}>
        {pastElections.length === 0 ? (
          <div className="card">
            <p style={{ color: "var(--muted)" }}>No past elections.</p>
          </div>
        ) : (
          pastElections.map((el) => (
            <ElectionCard
              key={el.id}
              election={el}
              onVote={() => {}}
              onViewResults={() => openResults(el.id)}
              formatDate={formatDate}
            />
          ))
        )}
      </div>

      {/* ═══ BALLOT MODAL ═══ */}
      {ballotElection && (
        <div className="modal-overlay open" onClick={() => setBallotElection(null)}>
          <div className="modal" style={{ maxWidth: 600, width: "calc(100% - 32px)", margin: "16px auto", maxHeight: "calc(100vh - 32px)" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setBallotElection(null)}>✕</button>
            <h3>{ballotElection.title}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
              Select one candidate per position. Your vote is confidential and cannot be changed after submission.
            </p>

            {ballotPositions.map((pos) => {
              const posCandidates = getCandidatesForPosition(pos.id);
              const alreadyVoted = votedPositions.includes(pos.id);
              return (
                <div key={pos.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ marginBottom: 8 }}>{pos.title}</h4>
                    {alreadyVoted && <span className="badge badge-active">Voted</span>}
                  </div>

                  {posCandidates.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No candidates for this position.</p>
                  ) : (
                    posCandidates.map((c) => (
                      <label
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: 10,
                          border: `1px solid ${selections[pos.id] === c.id ? "var(--green)" : "var(--border)"}`,
                          borderRadius: "var(--radius-md)",
                          marginBottom: 6,
                          cursor: alreadyVoted ? "default" : "pointer",
                          opacity: alreadyVoted ? 0.6 : 1,
                          background: selections[pos.id] === c.id ? "var(--green-light)" : "transparent",
                        }}
                      >
                        <input
                          type="radio"
                          name={`pos-${pos.id}`}
                          value={c.id}
                          checked={selections[pos.id] === c.id}
                          onChange={() => setSelections((p) => ({ ...p, [pos.id]: c.id }))}
                          disabled={alreadyVoted}
                          style={{ accentColor: "var(--green)" }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{c.first_name} {c.last_name}</strong>
                          <br />
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.membership_category_name} · {c.membership_code}</span>
                        </div>
                        {c.statement && (
                          <span style={{ fontSize: 12, color: "var(--muted)", maxWidth: "35%", textAlign: "right", flexShrink: 0 }}>
                            "{c.statement.substring(0, 60)}{c.statement.length > 60 ? "…" : ""}"
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              );
            })}

            {ballotPositions.some((p) => !votedPositions.includes(p.id)) && (
              <button
                className="btn btn-accent btn-lg"
                style={{ width: "100%" }}
                onClick={submitVote}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit Vote"}
              </button>
            )}
            <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
              Once submitted, your vote cannot be changed.
            </p>
          </div>
        </div>
      )}

      {/* ═══ DECLARE INTEREST MODAL (with form upload + payment proof) ═══ */}
      {declareElection && (
        <div className="modal-overlay open" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); setDeclareFormFile(null); setDeclareProofFile(null); }}>
          <div className="modal" style={{ maxWidth: 550, width: "calc(100% - 32px)", margin: "16px auto", maxHeight: "calc(100vh - 32px)", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); setDeclareFormFile(null); setDeclareProofFile(null); }}>✕</button>
            <h3>📝 Declaration of Interest</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {declareElection.title} — Download the form, fill it out, and upload it.
            </p>

            {/* Instructions */}
            <div style={{
              padding: 12, marginBottom: 16, borderRadius: "var(--radius-md)",
              background: "var(--bg)", border: "1px solid var(--border)",
              fontSize: 13,
            }}>
              <strong>How it works:</strong>
              <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                <li>Select the position you wish to contest</li>
                <li><strong>Download</strong> the Declaration of Interest form below</li>
                <li>Fill out the form (print &amp; sign or fill digitally)</li>
                <li><strong>Upload</strong> the completed form below</li>
                <li>Submit — admin will review and respond</li>
              </ol>
              <div style={{ marginTop: 10 }}>
                <a
                  href="/forms/declaration-of-interest.html"
                  className="btn btn-outline btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  📄 Download Declaration of Interest Form (PDF)
                </a>
              </div>
            </div>

            <div className="form-group">
              <label>Position *</label>
              <select
                value={declarePositionId}
                onChange={(e) => setDeclarePositionId(e.target.value)}
              >
                <option value="">— Select a position —</option>
                {declarePositions.map((pos) => {
                  const existing = declaredForPosition(pos.id);
                  return (
                    <option key={pos.id} value={pos.id} disabled={!!existing}>
                      {pos.title} {existing ? `(${existing.status})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Personal Statement (optional)</label>
              <textarea
                rows={3}
                value={declareStatement}
                onChange={(e) => setDeclareStatement(e.target.value)}
                placeholder="Tell members why you're running for this position…"
              />
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label>Upload Completed Form *</label>
              <div style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                textAlign: "center",
                background: declareFormFile ? "var(--green-light)" : "var(--bg)",
                cursor: "pointer",
                minHeight: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
                onClick={() => document.getElementById("declare-file-input")?.click()}
              >
                {declareFormFile ? (
                  <div style={{ wordBreak: "break-word", width: "100%" }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}><strong>{declareFormFile.name}</strong></p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{(declareFormFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setDeclareFormFile(null); }}
                      style={{ marginTop: 4 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28 }}>📄</span>
                    <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>
                      Tap to select your completed form<br />
                      <span style={{ fontSize: 11 }}>PDF, DOC, DOCX, or image (max 20 MB)</span>
                    </p>
                  </div>
                )}
                <input
                  id="declare-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDeclareFormFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {/* 💳 Payment Info */}
            <div style={{
              padding: 12, marginBottom: 16, borderRadius: "var(--radius-md)",
              background: "var(--bg)", border: "1px solid var(--border)",
              fontSize: 13,
            }}>
              <strong>💳 Declaration Fee:</strong> Pay <strong>₦50,000</strong> to the account below, then upload your proof of payment.
              <div style={{
                marginTop: 8, padding: 10, borderRadius: "var(--radius-md)",
                background: "var(--green-light)",
              }}>
                <p style={{ fontWeight: 700, margin: 0 }}>Polaris bank</p>
                <p style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0", fontFamily: "var(--font-mono)" }}>
                  409 123 9056
                </p>
                <p style={{ margin: 0 }}>GKAC</p>
              </div>
            </div>

            {/* Proof of Payment Upload */}
            <div className="form-group">
              <label>Upload Proof of Payment *</label>
              <div style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                textAlign: "center",
                background: declareProofFile ? "var(--green-light)" : "var(--bg)",
                cursor: "pointer",
                minHeight: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
                onClick={() => document.getElementById("declare-proof-input")?.click()}
              >
                {declareProofFile ? (
                  <div style={{ wordBreak: "break-word", width: "100%" }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}><strong>{declareProofFile.name}</strong></p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{(declareProofFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setDeclareProofFile(null); }}
                      style={{ marginTop: 4 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28 }}>📸</span>
                    <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>
                      Tap to upload your payment receipt or screenshot<br />
                      <span style={{ fontSize: 11 }}>PDF, JPG, PNG (max 5 MB)</span>
                    </p>
                  </div>
                )}
                <input
                  id="declare-proof-input"
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDeclareProofFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-accent"
                style={{ flex: 1, minWidth: 140 }}
                onClick={submitDeclaration}
                disabled={declaring || !declarePositionId || !declareFormFile || !declareProofFile}
              >
                {declaring ? "Submitting…" : "Submit Declaration"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); setDeclareFormFile(null); setDeclareProofFile(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NOMINATION MODAL (nominate another member with form upload + payment proof) ═══ */}
      {nominateElection && (
        <div className="modal-overlay open" onClick={() => { setNominateElection(null); setNominatePositionId(""); setNominateStatement(""); setNominateFormFile(null); setNominateProofFile(null); setNomineeSearch(""); setNomineeResults([]); setNomineeUserId(""); }}>
          <div className="modal" style={{ maxWidth: 550, width: "calc(100% - 32px)", margin: "16px auto", maxHeight: "calc(100vh - 32px)", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setNominateElection(null); setNominatePositionId(""); setNominateStatement(""); setNominateFormFile(null); setNominateProofFile(null); setNomineeSearch(""); setNomineeResults([]); setNomineeUserId(""); }}>✕</button>
            <h3>📋 Nomination Form</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {nominateElection.title} — Nominate a fellow member for a position. Download the form, fill it, and upload.
            </p>

            {/* Instructions */}
            <div style={{
              padding: 12, marginBottom: 16, borderRadius: "var(--radius-md)",
              background: "var(--bg)", border: "1px solid var(--border)",
              fontSize: 13,
            }}>
              <strong>How it works:</strong>
              <ol style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                <li>Select the position you wish to nominate someone for</li>
                <li>Search for and select the member you are nominating</li>
                <li><strong>Download</strong> the Nomination form below</li>
                <li>Fill out the form with the nominee's details and your details as the nominator</li>
                <li><strong>Upload</strong> the completed form below</li>
                <li>Submit — admin will review and respond</li>
              </ol>
              <div style={{ marginTop: 10 }}>
                <a
                  href="/forms/nomination-form.html"
                  className="btn btn-outline btn-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  📄 Download Nomination Form (PDF)
                </a>
              </div>
            </div>

            <div className="form-group">
              <label>Position *</label>
              <select
                value={nominatePositionId}
                onChange={(e) => {
                  setNominatePositionId(e.target.value);
                  const pos = nominatePositions.find((p) => p.id === e.target.value);
                  setNominationFee(pos?.title?.toLowerCase() === "president" ? 100000 : 50000);
                }}
              >
                <option value="">— Select a position —</option>
                {nominatePositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title} ({pos.title.toLowerCase() === "president" ? "₦100,000" : "₦50,000"})
                  </option>
                ))}
              </select>
            </div>

            {/* Nominee Search */}
            <div className="form-group">
              <label>Nominate Member *</label>
              <input
                type="text"
                placeholder="Search for a member by name, email, or membership no…"
                value={nomineeSearch}
                onChange={(e) => searchNomineeMembers(e.target.value)}
              />
              {nomineeResults.length > 0 && (
                <div style={{
                  marginTop: 4, border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                  maxHeight: 200, overflowY: "auto", background: "var(--bg)"
                }}>
                  {nomineeResults.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setNomineeUserId(m.id);
                        setNomineeSearch(`${m.name} (${m.email})`);
                        setNomineeResults([]);
                      }}
                      style={{
                        padding: "10px 12px", cursor: "pointer", fontSize: 13,
                        borderBottom: "1px solid var(--border)", background: nomineeUserId === m.id ? "var(--green-light)" : "transparent",
                      }}
                    >
                      <div><strong>{m.name}</strong></div>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
                        {m.email} · {m.mno}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {nomineeUserId && !nomineeResults.length && (
                <span style={{ fontSize: 12, color: "var(--green)" }}>✅ Member selected</span>
              )}
            </div>

            <div className="form-group">
              <label>Your Statement (optional)</label>
              <textarea
                rows={3}
                value={nominateStatement}
                onChange={(e) => setNominateStatement(e.target.value)}
                placeholder="Why do you think this member is suitable for the position?"
              />
            </div>

            {/* File Upload */}
            <div className="form-group">
              <label>Upload Completed Nomination Form *</label>
              <div style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                textAlign: "center",
                background: nominateFormFile ? "var(--green-light)" : "var(--bg)",
                cursor: "pointer",
                minHeight: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
                onClick={() => document.getElementById("nominate-file-input")?.click()}
              >
                {nominateFormFile ? (
                  <div style={{ wordBreak: "break-word", width: "100%" }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}><strong>{nominateFormFile.name}</strong></p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{(nominateFormFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setNominateFormFile(null); }}
                      style={{ marginTop: 4 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28 }}>📄</span>
                    <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>
                      Tap to select the completed nomination form<br />
                      <span style={{ fontSize: 11 }}>PDF, DOC, DOCX, or image (max 20 MB)</span>
                    </p>
                  </div>
                )}
                <input
                  id="nominate-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNominateFormFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: 12, marginBottom: 16, borderRadius: "var(--radius-md)",
              background: "var(--bg)", border: "1px solid var(--border)",
              fontSize: 13,
            }}>
              <strong>💳 Nomination Fee:</strong> Pay <strong>₦{(nominationFee).toLocaleString()}</strong> to the account below, then upload your proof of payment.
              <div style={{
                marginTop: 8, padding: 10, borderRadius: "var(--radius-md)",
                background: "var(--green-light)",
              }}>
                <p style={{ fontWeight: 700, margin: 0 }}>Polaris Bank</p>
                <p style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0", fontFamily: "var(--font-mono)" }}>
                  409 123 9056
                </p>
                <p style={{ margin: 0 }}>GKAC</p>
              </div>
            </div>

            {/* Proof of Payment Upload */}
            <div className="form-group">
              <label>Upload Proof of Payment *</label>
              <div style={{
                border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                textAlign: "center",
                background: nominateProofFile ? "var(--green-light)" : "var(--bg)",
                cursor: "pointer",
                minHeight: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
                onClick={() => document.getElementById("nominate-proof-input")?.click()}
              >
                {nominateProofFile ? (
                  <div style={{ wordBreak: "break-word", width: "100%" }}>
                    <span style={{ fontSize: 24 }}>✅</span>
                    <p style={{ margin: "4px 0", fontSize: 13 }}><strong>{nominateProofFile.name}</strong></p>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{(nominateProofFile.size / 1024).toFixed(1)} KB</p>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={(e) => { e.stopPropagation(); setNominateProofFile(null); }}
                      style={{ marginTop: 4 }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ fontSize: 28 }}>📸</span>
                    <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>
                      Tap to upload your payment receipt or screenshot<br />
                      <span style={{ fontSize: 11 }}>PDF, JPG, PNG (max 5 MB)</span>
                    </p>
                  </div>
                )}
                <input
                  id="nominate-proof-input"
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNominateProofFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-accent"
                style={{ flex: 1, minWidth: 140 }}
                onClick={submitNomination}
                disabled={nominating || !nominatePositionId || !nomineeUserId || !nominateFormFile || !nominateProofFile}
              >
                {nominating ? "Submitting…" : "Submit Nomination"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setNominateElection(null); setNominatePositionId(""); setNominateStatement(""); setNominateFormFile(null); setNominateProofFile(null); setNomineeSearch(""); setNomineeResults([]); setNomineeUserId(""); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULTS MODAL ═══ */}
      {results && (
        <div className="modal-overlay open" onClick={() => setResults(null)}>
          <div className="modal" style={{ maxWidth: 600, width: "calc(100% - 32px)", margin: "16px auto", maxHeight: "calc(100vh - 32px)" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setResults(null)}>✕</button>
            <h3 style={{ marginBottom: 4 }}>{results.election.title}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Status: <strong>{results.election.status.toUpperCase()}</strong>
              {results.election.status === "active" && " · Results update in real-time"}
            </p>

            {/* Summary */}
            <div className="stats-row" style={{ marginBottom: 16, gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22 }}>{results.summary.eligibleVoters}</div>
                <div className="stat-label">Eligible</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22, color: "var(--success)" }}>{results.summary.totalVoters}</div>
                <div className="stat-label">Voted</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22 }}>{results.summary.turnout}%</div>
                <div className="stat-label">Turnout</div>
                <div className="progress-bar" style={{ marginTop: 4 }}>
                  <div className="fill" style={{ width: `${results.summary.turnout}%` }} />
                </div>
              </div>
            </div>

            {/* Positions */}
            {results.positions.map((pos) => {
              const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
              return (
                <div key={pos.id} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 8 }}>{pos.title} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>({pos.totalVotes} votes)</span></h4>
                  {sorted.map((c, i) => (
                    <div key={c.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      marginBottom: 4,
                      background: i === 0 && pos.totalVotes > 0 ? "var(--green-light)" : "transparent",
                      borderRadius: "var(--radius-md)",
                      border: i === 0 && pos.totalVotes > 0 ? "1px solid var(--green)" : "1px solid transparent",
                    }}>
                      <div style={{ fontSize: 14, wordBreak: "break-word", flex: 1, minWidth: 0, paddingRight: 8 }}>
                        {c.firstName} {c.lastName}
                        {i === 0 && results.election.status === "closed" && pos.totalVotes > 0 && (
                          <span className="badge badge-active" style={{ marginLeft: 6 }}>Winner</span>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <strong>{c.voteCount}</strong>
                        <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>({c.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`toast${toast.msg ? " show" : ""}${toast.type ? " " + toast.type : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}

// ─── Election Card Component ────────────────────────────────────────────
function ElectionCard({
  election,
  onVote,
  onViewResults,
  formatDate,
}: {
  election: Election;
  onVote: () => void;
  onViewResults: () => void;
  formatDate: (d: string | null) => string;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <strong style={{ fontSize: 16, flex: 1, wordBreak: "break-word" }}>{election.title}</strong>
          <span className={`status-badge ${election.status === "active" ? "status-active" : election.status === "closed" ? "status-expired" : "status-pending"}`} style={{ flexShrink: 0 }}>
            {election.status === "active" ? "Voting Open" : election.status === "closed" ? "Closed" : election.status}
          </span>
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{election.description || ""}</span>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
          {election.start_date && <>🗓 {formatDate(election.start_date)}</>}
          {election.end_date && <> – {formatDate(election.end_date)}</>}
          {election.total_votes > 0 && <> · 🗳 {election.total_votes} votes cast</>}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {election.status === "active" && (
          <button className="btn btn-accent" onClick={onVote}>Cast Your Vote</button>
        )}
        <button className="btn btn-outline btn-sm" onClick={onViewResults}>View Results</button>
      </div>

      {/* Turnout bar for active/closed */}
      {(election.status === "active" || election.status === "closed") && election.total_votes > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
            <span>Turnout</span>
            <span>{election.total_votes} / {election.eligible_voters} ({election.eligible_voters > 0 ? Math.round((election.total_votes / election.eligible_voters) * 100) : 0}%)</span>
          </div>
          <div className="progress-bar">
            <div className="fill" style={{ width: `${election.eligible_voters > 0 ? Math.round((election.total_votes / election.eligible_voters) * 100) : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
