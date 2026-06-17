"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Election, type ElectionPosition, type ElectionCandidate, type ElectionDeclaration, type ElectionResults } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

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

  // Declaration modal
  const [declareElection, setDeclareElection] = useState<Election | null>(null);
  const [declarePositionId, setDeclarePositionId] = useState("");
  const [declareStatement, setDeclareStatement] = useState("");
  const [declaring, setDeclaring] = useState(false);

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

  // ─── Declare Interest ────────────────────────────────────────────────────
  async function submitDeclaration() {
    if (!declareElection || !declarePositionId) return;
    setDeclaring(true);
    const res = await api.declareInterest(declareElection.id, declarePositionId, declareStatement || undefined);
    if (res.data) {
      showToast("Interest declared! Awaiting admin approval.", "success");
      setDeclareElection(null);
      setDeclarePositionId("");
      setDeclareStatement("");
      await loadVoteState(declareElection.id);
    } else {
      showToast(res.error || "Failed to declare interest", "error");
    }
    setDeclaring(false);
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
          upcomingElections.map((el) => (
            <div key={el.id} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{el.title}</strong>
                  <br />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{el.description || ""}</span>
                  {el.start_date && (
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                      🗓 Voting opens: {formatDate(el.start_date)}
                    </p>
                  )}
                </div>
                <span className="status-badge status-pending">{el.status === "draft" ? "Draft" : "Upcoming"}</span>
              </div>

              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 12 }}
                onClick={async () => {
                  setDeclareElection(el);
                  await loadVoteState(el.id);
                }}
              >
                Declare Interest
              </button>
              {myDeclarations.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <strong>My Declarations:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {myDeclarations.map((d) => (
                      <li key={d.id}>
                        {d.position_title || ""} — <span className={d.status === "approved" ? "badge badge-active" : d.status === "rejected" ? "badge badge-expired" : "badge badge-pending"}>{d.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
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
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
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
                        <div>
                          <strong>{c.first_name} {c.last_name}</strong>
                          <br />
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>{c.membership_category_name} · {c.membership_code}</span>
                        </div>
                        {c.statement && (
                          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: "auto", maxWidth: "40%", textAlign: "right" }}>
                            "{c.statement}"
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

      {/* ═══ DECLARE INTEREST MODAL ═══ */}
      {declareElection && (
        <div className="modal-overlay open" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); }}>✕</button>
            <h3>Declare Interest</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              {declareElection.title} — Select the position you wish to contest.
            </p>

            <div className="form-group">
              <label>Position *</label>
              <select
                value={declarePositionId}
                onChange={(e) => setDeclarePositionId(e.target.value)}
              >
                <option value="">— Select a position —</option>
                {ballotPositions.map((pos) => {
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
                rows={4}
                value={declareStatement}
                onChange={(e) => setDeclareStatement(e.target.value)}
                placeholder="Tell members why you're running for this position…"
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-accent"
                onClick={submitDeclaration}
                disabled={declaring || !declarePositionId}
              >
                {declaring ? "Submitting…" : "Submit Declaration"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setDeclareElection(null); setDeclarePositionId(""); setDeclareStatement(""); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULTS MODAL ═══ */}
      {results && (
        <div className="modal-overlay open" onClick={() => setResults(null)}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setResults(null)}>✕</button>
            <h3 style={{ marginBottom: 4 }}>{results.election.title}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
              Status: <strong>{results.election.status.toUpperCase()}</strong>
              {results.election.status === "active" && " · Results update in real-time"}
            </p>

            {/* Summary */}
            <div className="stats-row" style={{ marginBottom: 16, gridTemplateColumns: "1fr 1fr 1fr" }}>
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
                      <div style={{ fontSize: 14 }}>
                        {c.firstName} {c.lastName}
                        {i === 0 && results.election.status === "closed" && pos.totalVotes > 0 && (
                          <span className="badge badge-active" style={{ marginLeft: 6 }}>Winner</span>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ fontSize: 16 }}>{election.title}</strong>
          <br />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{election.description || ""}</span>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
            {election.start_date && <>🗓 {formatDate(election.start_date)}</>}
            {election.end_date && <> – {formatDate(election.end_date)}</>}
            {election.total_votes > 0 && <> · 🗳 {election.total_votes} votes cast</>}
          </p>
        </div>
        <span className={`status-badge ${election.status === "active" ? "status-active" : election.status === "closed" ? "status-expired" : "status-pending"}`}>
          {election.status === "active" ? "Voting Open" : election.status === "closed" ? "Closed" : election.status}
        </span>
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
