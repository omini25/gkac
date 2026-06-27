"use client";

import { useState, useEffect, useRef } from "react";
import { api, type Election, type ElectionResults, type ElectionCandidate } from "@/lib/api";
import Link from "next/link";
import PosterCarousel from "@/components/PosterCarousel";

// ─── Poster interface ───────────────────────────────────────────────────────
interface Poster {
  id: string;
  election_id: string | null;
  title: string | null;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
}

// ─── Election Calendar Timeline Data ────────────────────────────────────────
const ELECTION_TIMELINE = [
  {
    date: "15th – 23rd June 2026",
    title: "Expression of Interest & Nomination",
    description: "Qualified candidates are to fill their Expression of Interest and Nomination forms. To vote and to be voted for, all forms must be submitted within this period.",
    status: "active",
  },
  {
    date: "2nd of July 2026",
    title: "Release of Eligible Voters & Qualified Candidates",
    description: "Upload of eligible voters and qualified candidates to the electorate for verification.",
    status: "upcoming",
  },
  {
    date: "4th of July 2026",
    title: "🗳️ Election Day",
    description: "Voting process begins at 10:00 AM and closes at 4:00 PM. All eligible voters are required to participate in this election.",
    time: "10:00 AM – 4:00 PM",
    status: "upcoming",
  },
  {
    date: "After Close of Voting",
    title: "Announcement of Results",
    description: "Electoral committee to collate and announce all duly elected officials after voting ends.",
    status: "upcoming",
  },
  {
    date: "After Close of Voting",
    title: "Presentation of Certificate of Return",
    description: "All elected officers are required to join the election situation room immediately after the close of voting for the collection of their certificate of return.",
    status: "upcoming",
  },
  {
    date: "5th – 6th July 2026",
    title: "Submission of Election Petition",
    description: "All aggrieved candidates are to submit their petition to the electoral committee. The petition must contain the petitioner's name, statement of purpose, and reason for petition. The election petition panel will sit for 2 weeks.",
    status: "upcoming",
  },
  {
    date: "Saturday, 25th July 2026",
    title: "🤝 Swearing-In Ceremony",
    description: "All newly elected executive committee members will be sworn in at the Annual General Meeting slated for July 25th, 2026.",
    status: "upcoming",
  },
];

export default function PublicElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [detailElection, setDetailElection] = useState<Election | null>(null);

  // Candidates data per election (for upcoming/active tabs)
  const [candidateMap, setCandidateMap] = useState<Record<string, ElectionCandidate[]>>({});
  const [candidatesLoading, setCandidatesLoading] = useState<Record<string, boolean>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  const [posters, setPosters] = useState<Poster[]>([]);
  const [postersLoading, setPostersLoading] = useState(true);

  useEffect(() => {
    api.getElections().then((res) => {
      if (res.data) setElections(res.data.elections);
      setLoading(false);
    });
    // Fetch all posters
    api.getPosters().then((res) => {
      if (res.data) setPosters(res.data.posters);
      setPostersLoading(false);
    });
  }, []);

  // Fetch candidates for upcoming and active elections (once per election)
  useEffect(() => {
    const targetElections = elections.filter((e) => e.status === "upcoming" || e.status === "active");
    for (const el of targetElections) {
      if (!fetchedRef.current.has(el.id)) {
        fetchedRef.current.add(el.id);
        setCandidatesLoading((prev) => ({ ...prev, [el.id]: true }));
        api.getCandidates(el.id).then((res) => {
          if (res.data) {
            setCandidateMap((prev) => ({ ...prev, [el.id]: res.data!.candidates }));
          }
          setCandidatesLoading((prev) => ({ ...prev, [el.id]: false }));
        });
      }
    }
  }, [elections]);

  const activeElections = elections.filter((e) => e.status === "active");
  const upcomingElections = elections.filter((e) => e.status === "upcoming");
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

  async function openResults(electionId: string) {
    setResultsLoading(true);
    const res = await api.getResults(electionId);
    if (res.data) setResults(res.data);
    setResultsLoading(false);
  }

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
          <div className="section-divider" />
          <h2>Elections</h2>
          <p>
            Stay informed about GKAC elections — view schedules, candidates, and results
            for all club elections.
          </p>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* ELECTION CALENDAR — 2026-2028 Timeline          */}
        {/* ════════════════════════════════════════════════ */}
        <div className="card" style={{
          marginBottom: "var(--space-4)", background: "var(--green-light)",
          border: "1px solid var(--green)", textAlign: "center",
        }}>
          <p style={{ fontWeight: 700, marginBottom: "var(--space-1)" }}>
            ⚠️ IMPORTANT NOTICE — 2026-2028 ELECTION PROCESS
          </p>
          <p style={{ margin: 0, fontSize: 15 }}>
            The Electoral Committee has kick-started the Year 2026-2028 Election Process.
            Payment of all allotted fees validates eligibility to be voted for.
          </p>
        </div>

        <div className="milestone-timeline" style={{ maxWidth: 800, margin: "0 auto var(--space-4)" }}>
          {ELECTION_TIMELINE.map((item, idx) => (
            <div key={idx} className="milestone-item" style={{
              borderLeft: item.status === "active" ? "4px solid var(--accent)" : "4px solid var(--border)",
            }}>
              <div className="milestone-year" style={{
                background: item.status === "active" ? "var(--accent)" : "var(--muted)",
                color: "#fff",
              }}>
                {item.date}
              </div>
              <h4>{item.title}</h4>
              <p>{item.description}</p>
              {item.time && (
                <p style={{ fontWeight: 600, marginTop: "var(--space-1)" }}>
                  🕐 {item.time}
                </p>
              )}
              {item.status === "active" && (
                <span className="status-badge status-active" style={{ marginTop: "var(--space-1)", display: "inline-block" }}>
                  ● Active Now
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Payment Info */}
        {/* <div className="card" style={{ maxWidth: 600, margin: "0 auto var(--space-4)", textAlign: "center" }}>
          <h4 style={{ marginBottom: "var(--space-1)" }}>Election Process Payment Account</h4>
          <div style={{
            background: "var(--green-light)", padding: "var(--space-2)",
            borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontWeight: 700, margin: 0 }}>Opay Account</p>
            <p style={{ fontSize: "24px", fontWeight: 700, margin: "var(--space-1) 0", fontFamily: "var(--font-mono)" }}>
              703 5330 954
            </p>
            <p style={{ margin: 0 }}>Oluyemi Akintayo</p>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "var(--space-1)" }}>
            PRO, Electoral Committee — Ambassador Oluyemi Akintayo (Pemisire)
          </p>
        </div> */}

        {/* Action Buttons */}
        <div style={{ textAlign: "center", marginBottom: "var(--space-4)", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/dashboard/elections" className="btn btn-accent btn-lg">
            📝 Declaration of Interest
          </Link>
          <Link href="/dashboard/elections" className="btn btn-outline btn-lg">
            📋 Nomination Form
          </Link>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* MEMBERS' CAMPAIGN GALLERY                      */}
        {/* ════════════════════════════════════════════════ */}
        {/* Dynamic Campaign Gallery from admin-uploaded posters */}
        {postersLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            <span className="loader-dot" />
          </div>
        ) : posters.length > 0 ? (
          <PosterCarousel
            images={posters.map((p) => api.getPosterUrl(p.filename))}
            folder=""  /* URLs are absolute, so folder is not used */
            title="🗳️ Members&apos; Campaign Gallery"
            description="View campaign materials from candidates contesting in the 2026-2028 GKAC elections."
          />
        ) : (
          /* Fallback to static posters in public/election-campagins/ */
          <PosterCarousel
            images={[
              "WhatsApp Image 2026-06-22 at 10.53.49.jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.49 (1).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.49 (2).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.50.jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.50 (1).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.50 (2).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.50 (3).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.50 (4).jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.51.jpeg",
              "WhatsApp Image 2026-06-22 at 10.53.51 (1).jpeg",
            ]}
            folder="election-campagins"
            title="🗳️ Members&apos; Campaign Gallery"
            description="View campaign materials from candidates contesting in the 2026-2028 GKAC elections."
          />
        )}

        {/* ════════════════════════════════════════════════ */}
        {/* ELECTION LISTS                                  */}
        {/* ════════════════════════════════════════════════ */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-4)" }}>
          <div className="tabs" style={{ marginBottom: 24 }}>
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

          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            {/* ═══ ACTIVE ═══ */}
            <div className={`tab-panel${activeTab === "active" ? " active" : ""}`}>
              {loading ? (
                <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading elections…</p>
              ) : activeElections.length === 0 ? (
                <div className="card" style={{ textAlign: "center" }}>
                  <p style={{ color: "var(--muted)", marginBottom: 8 }}>No active elections right now.</p>
                  <p style={{ fontSize: 14, color: "var(--muted)" }}>
                    Check the calendar above for upcoming election dates.
                  </p>
                </div>
              ) : (
                activeElections.map((el) => (
                  <ElectionCard
                    key={el.id}
                    election={el}
                    candidates={candidateMap[el.id]}
                    candidatesLoading={candidatesLoading[el.id]}
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
                  <p style={{ color: "var(--muted)" }}>No upcoming elections scheduled. See the Election Calendar above.</p>
                </div>
              ) : (
                upcomingElections.map((el) => (
                  <ElectionCard
                    key={el.id}
                    election={el}
                    candidates={candidateMap[el.id]}
                    candidatesLoading={candidatesLoading[el.id]}
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
      </div>

      {/* ═══ ELECTION DETAIL MODAL ═══ */}
      {detailElection && (
        <div className="modal-overlay open" onClick={() => setDetailElection(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailElection(null)}>✕</button>
            <h3 style={{ marginBottom: 8 }}>{detailElection.title}</h3>
            <span className={`status-badge ${getStatusClass(detailElection.status)}`} style={{ marginBottom: 16, display: "inline-block" }}>
              {getStatusLabel(detailElection.status)}
            </span>
            {detailElection.description && <p style={{ marginTop: 12, color: "var(--muted)" }}>{detailElection.description}</p>}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
              {detailElection.start_date && <div><strong>Voting opens:</strong> {formatDate(detailElection.start_date)}</div>}
              {detailElection.end_date && <div><strong>Voting closes:</strong> {formatDate(detailElection.end_date)}</div>}
              <div><strong>Positions available:</strong> {detailElection.positions_count}</div>
              {detailElection.status !== "draft" && detailElection.status !== "upcoming" && <div><strong>Total votes cast:</strong> {detailElection.total_votes}</div>}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              {(detailElection.status === "active" || detailElection.status === "closed") && (
                <button className="btn btn-accent" onClick={() => { setDetailElection(null); openResults(detailElection.id); }}>View Results</button>
              )}
              <button className="btn btn-ghost" onClick={() => setDetailElection(null)}>Close</button>
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
            <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Status: <strong>{results.election.status.toUpperCase()}</strong></p>

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
                <div className="stat-value" style={{ fontSize: 22 }}>{results.summary.turnoutPercentage}%</div>
                <div className="stat-label">Turnout</div>
                <div className="progress-bar" style={{ marginTop: 4 }}>
                  <div className="fill" style={{ width: `${results.summary.turnoutPercentage}%` }} />
                </div>
              </div>
            </div>

            {results.positions.map((pos) => {
              const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
              return (
                <div key={pos.id} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 8 }}>
                    {pos.title} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)" }}>({pos.totalVotes} votes)</span>
                  </h4>
                  {sorted.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>No candidates for this position.</p>
                  ) : (
                    sorted.map((c, i) => (
                      <div key={c.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", marginBottom: 4,
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
                    ))
                  )}
                </div>
              );
            })}

            <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setResults(null)}>Close Results</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Election Card Component ────────────────────────────────────────────────
function ElectionCard({
  election, candidates, candidatesLoading, onViewDetails, onViewResults,
  formatDate, formatDateShort, getStatusLabel, getStatusClass,
}: {
  election: Election;
  candidates?: ElectionCandidate[];
  candidatesLoading?: boolean;
  onViewDetails: () => void;
  onViewResults: () => void;
  formatDate: (d: string | null) => string;
  formatDateShort: (d: string | null) => string;
  getStatusLabel: (s: string) => string;
  getStatusClass: (s: string) => string;
}) {
  // Group candidates by position
  const positions = candidates
    ? groupBy(candidates, (c) => c.position_title || "Other")
    : {};

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ fontSize: 16 }}>{election.title}</strong>
          <br />
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {election.start_date && formatDateShort(election.start_date)}
            {election.end_date && ` — ${formatDateShort(election.end_date)}`}
          </span>
        </div>
        <span className={`status-badge ${getStatusClass(election.status)}`} style={{ fontSize: 12 }}>
          ● {getStatusLabel(election.status)}
        </span>
      </div>

      <p style={{ fontSize: 14, marginTop: 8 }}>{election.description || "No description provided."}</p>

      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
        <span><strong>{election.positions_count || 0}</strong> positions</span>
        {election.status !== "draft" && (
          <>
            <span><strong>{election.total_votes || 0}</strong> votes cast</span>
            <span><strong>{election.eligible_voters || 0}</strong> eligible voters</span>
          </>
        )}
      </div>

      {/* Positions & Candidates */}
      {(election.status === "upcoming" || election.status === "active") && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <h4 style={{ fontSize: 14, marginBottom: 12, color: "var(--text)" }}>🏛️ Positions & Candidates</h4>
          {candidatesLoading ? (
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 8 }}>
              <span className="loader-dot" />
            </p>
          ) : candidates && candidates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(positions).map(([positionTitle, posCandidates]) => (
                <div key={positionTitle} style={{
                  background: "var(--bg)", borderRadius: "var(--radius-md)",
                  padding: "10px 14px", border: "1px solid var(--border)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "var(--accent)" }}>
                    {positionTitle}
                    <span style={{ fontWeight: 400, fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>
                      {posCandidates.length} candidate{posCandidates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {posCandidates.map((c) => (
                      <span key={c.id} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 20,
                        background: "var(--surface)", border: "1px solid var(--border)",
                        fontSize: 13,
                      }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: "var(--accent)", color: "#fff",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700,
                        }}>
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </span>
                        {c.first_name} {c.last_name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
              No candidates have been qualified yet. Check back later.
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-outline" onClick={onViewDetails}>View Details</button>
        {(election.status === "active" || election.status === "closed") && (
          <button className="btn btn-sm btn-outline" onClick={onViewResults}>View Results</button>
        )}
      </div>
    </div>
  );
}

/** Simple groupBy helper */
function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}


