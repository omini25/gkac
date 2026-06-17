"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Election, type ElectionResults } from "@/lib/api";

export default function PublicElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  // Results modal
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Election detail modal
  const [detailElection, setDetailElection] = useState<Election | null>(null);

  useEffect(() => {
    api.getElections().then((res) => {
      if (res.data) setElections(res.data.elections);
      setLoading(false);
    });
  }, []);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const activeElections = elections.filter((e) => e.status === "active");
  const upcomingElections = elections.filter((e) => e.status === "upcoming" || e.status === "draft");
  const pastElections = elections.filter((e) => e.status === "closed");

  function formatDate(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDateShort(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // ─── Results ────────────────────────────────────────────────────────────
  async function openResults(electionId: string) {
    setResultsLoading(true);
    const res = await api.getResults(electionId);
    if (res.data) setResults(res.data);
    setResultsLoading(false);
  }

  // ─── Status helpers ─────────────────────────────────────────────────────
  function getStatusLabel(status: string) {
    switch (status) {
      case "active": return "Voting Open";
      case "closed": return "Closed";
      case "upcoming": return "Upcoming";
      case "draft": return "Draft";
      default: return status;
    }
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "active": return "status-active";
      case "closed": return "status-expired";
      case "upcoming": return "status-pending";
      case "draft": return "status-pending";
      default: return "";
    }
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Elections</h2>
          <p>
            Stay informed about GKAC elections — view schedules, candidates, and results
            for all club elections.
          </p>
        </div>

        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 24 }}>
            <button
              className={`tab-btn${activeTab === "active" ? " active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Active {activeElections.length > 0 && `(${activeElections.length})`}
            </button>
            <button
              className={`tab-btn${activeTab === "upcoming" ? " active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`tab-btn${activeTab === "past" ? " active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              Past Results
            </button>
          </div>

          {/* ═══ ACTIVE ═══ */}
          <div className={`tab-panel${activeTab === "active" ? " active" : ""}`}>
            {loading ? (
              <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading elections…</p>
            ) : activeElections.length === 0 ? (
              <div className="card" style={{ textAlign: "center" }}>
                <p style={{ color: "var(--muted)", marginBottom: 8 }}>No active elections right now.</p>
                <p style={{ fontSize: 14, color: "var(--muted)" }}>
                  Check the Upcoming tab for scheduled elections or check back later.
                </p>
              </div>
            ) : (
              activeElections.map((el) => (
                <ElectionCard
                  key={el.id}
                  election={el}
                  onViewDetails={() => setDetailElection(el)}
                  onViewResults={() => openResults(el.id)}
                  formatDate={formatDate}
                  formatDateShort={formatDateShort}
                  getStatusLabel={getStatusLabel}
                  getStatusClass={getStatusClass}
                />
              ))
            )}
          </div>

          {/* ═══ UPCOMING ═══ */}
          <div className={`tab-panel${activeTab === "upcoming" ? " active" : ""}`}>
            {loading ? (
              <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading elections…</p>
            ) : upcomingElections.length === 0 ? (
              <div className="card" style={{ textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>No upcoming elections scheduled.</p>
              </div>
            ) : (
              upcomingElections.map((el) => (
                <ElectionCard
                  key={el.id}
                  election={el}
                  onViewDetails={() => setDetailElection(el)}
                  onViewResults={() => {}}
                  formatDate={formatDate}
                  formatDateShort={formatDateShort}
                  getStatusLabel={getStatusLabel}
                  getStatusClass={getStatusClass}
                />
              ))
            )}
          </div>

          {/* ═══ PAST ═══ */}
          <div className={`tab-panel${activeTab === "past" ? " active" : ""}`}>
            {loading ? (
              <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading elections…</p>
            ) : pastElections.length === 0 ? (
              <div className="card" style={{ textAlign: "center" }}>
                <p style={{ color: "var(--muted)" }}>No past elections.</p>
              </div>
            ) : (
              pastElections.map((el) => (
                <ElectionCard
                  key={el.id}
                  election={el}
                  onViewDetails={() => setDetailElection(el)}
                  onViewResults={() => openResults(el.id)}
                  formatDate={formatDate}
                  formatDateShort={formatDateShort}
                  getStatusLabel={getStatusLabel}
                  getStatusClass={getStatusClass}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══ ELECTION DETAIL MODAL ═══ */}
      {detailElection && (
        <div className="modal-overlay open" onClick={() => setDetailElection(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailElection(null)}>✕</button>
            <h3 style={{ marginBottom: 8 }}>{detailElection.title}</h3>

            <span
              className={`status-badge ${getStatusClass(detailElection.status)}`}
              style={{ marginBottom: 16, display: "inline-block" }}
            >
              {getStatusLabel(detailElection.status)}
            </span>

            {detailElection.description && (
              <p style={{ marginTop: 12, color: "var(--muted)" }}>{detailElection.description}</p>
            )}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              {detailElection.start_date && (
                <div>
                  <strong>Voting opens:</strong> {formatDate(detailElection.start_date)}
                </div>
              )}
              {detailElection.end_date && (
                <div>
                  <strong>Voting closes:</strong> {formatDate(detailElection.end_date)}
                </div>
              )}
              <div>
                <strong>Positions available:</strong> {detailElection.positions_count}
              </div>
              {detailElection.status !== "draft" && detailElection.status !== "upcoming" && (
                <div>
                  <strong>Total votes cast:</strong> {detailElection.total_votes}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              {(detailElection.status === "active" || detailElection.status === "closed") && (
                <button
                  className="btn btn-accent"
                  onClick={() => {
                    setDetailElection(null);
                    openResults(detailElection.id);
                  }}
                >
                  View Results
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailElection(null)}>
                Close
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
            </p>

            {/* Summary stats */}
            <div
              className="stats-row"
              style={{ marginBottom: 16, gridTemplateColumns: "1fr 1fr 1fr" }}
            >
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {results.summary.eligibleVoters}
                </div>
                <div className="stat-label">Eligible</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22, color: "var(--success)" }}>
                  {results.summary.totalVoters}
                </div>
                <div className="stat-label">Voted</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 22 }}>
                  {results.summary.turnoutPercentage}%
                </div>
                <div className="stat-label">Turnout</div>
                <div className="progress-bar" style={{ marginTop: 4 }}>
                  <div
                    className="fill"
                    style={{ width: `${results.summary.turnoutPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Positions */}
            {results.positions.map((pos) => {
              const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
              return (
                <div
                  key={pos.id}
                  style={{
                    marginBottom: 16,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 12,
                  }}
                >
                  <h4 style={{ fontSize: 15, marginBottom: 8 }}>
                    {pos.title}{" "}
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>
                      ({pos.totalVotes} votes)
                    </span>
                  </h4>
                  {sorted.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>
                      No candidates for this position.
                    </p>
                  ) : (
                    sorted.map((c, i) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          marginBottom: 4,
                          background:
                            i === 0 && pos.totalVotes > 0
                              ? "var(--green-light)"
                              : "transparent",
                          borderRadius: "var(--radius-md)",
                          border:
                            i === 0 && pos.totalVotes > 0
                              ? "1px solid var(--green)"
                              : "1px solid transparent",
                        }}
                      >
                        <div style={{ fontSize: 14 }}>
                          {c.firstName} {c.lastName}
                          {i === 0 &&
                            results.election.status === "closed" &&
                            pos.totalVotes > 0 && (
                              <span
                                className="badge badge-active"
                                style={{ marginLeft: 6 }}
                              >
                                Winner
                              </span>
                            )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <strong>{c.voteCount}</strong>
                          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 4 }}>
                            ({c.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}

            <button
              className="btn btn-ghost"
              style={{ width: "100%" }}
              onClick={() => setResults(null)}
            >
              Close Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Election Card Component ────────────────────────────────────────────────
function ElectionCard({
  election,
  onViewDetails,
  onViewResults,
  formatDate,
  formatDateShort,
  getStatusLabel,
  getStatusClass,
}: {
  election: Election;
  onViewDetails: () => void;
  onViewResults: () => void;
  formatDate: (d: string | null) => string;
  formatDateShort: (d: string | null) => string;
  getStatusLabel: (s: string) => string;
  getStatusClass: (s: string) => string;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>{election.title}</strong>
          <br />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {election.description || ""}
          </span>

          {/* Timeline */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {election.start_date && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                <span style={{ fontWeight: 600 }}>Opens:</span>{" "}
                {formatDateShort(election.start_date)}
              </div>
            )}
            {election.end_date && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                <span style={{ fontWeight: 600 }}>Closes:</span>{" "}
                {formatDateShort(election.end_date)}
              </div>
            )}
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              <span style={{ fontWeight: 600 }}>Positions:</span>{" "}
              {election.positions_count}
            </div>
          </div>

          {election.total_votes > 0 && (
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              🗳 {election.total_votes} votes cast
            </p>
          )}
        </div>
        <span
          className={`status-badge ${getStatusClass(election.status)}`}
        >
          {getStatusLabel(election.status)}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn btn-outline btn-sm" onClick={onViewDetails}>
          View Details
        </button>
        {(election.status === "active" || election.status === "closed") && (
          <button className="btn btn-outline btn-sm" onClick={onViewResults}>
            View Results
          </button>
        )}
      </div>

      {/* Turnout bar for active/closed */}
      {(election.status === "active" || election.status === "closed") &&
        election.total_votes > 0 && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <span>Turnout</span>
              <span>
                {election.total_votes} / {election.eligible_voters} (
                {election.eligible_voters > 0
                  ? Math.round(
                      (election.total_votes / election.eligible_voters) * 100
                    )
                  : 0}
                %)
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="fill"
                style={{
                  width: `${
                    election.eligible_voters > 0
                      ? Math.round(
                          (election.total_votes / election.eligible_voters) *
                            100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
    </div>
  );
}
