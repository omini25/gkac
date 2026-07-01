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

        {/* ════════════════════════════════════════════════ */}
        {/* HERO HEADER                                     */}
        {/* ════════════════════════════════════════════════ */}
        <div style={{
          textAlign: "center",
          padding: "48px 24px 40px",
          marginBottom: "var(--space-4)",
          background: "linear-gradient(135deg, var(--navy) 0%, #1a2a4a 100%)",
          borderRadius: "var(--radius-lg)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            opacity: 0.5,
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
              padding: "6px 16px", borderRadius: 20, fontSize: 13,
              marginBottom: 16, fontWeight: 600,
            }}>
              🗳️ 2026-2028 Election Season
            </div> */}
            <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: "0 0 12px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              GKAC Elections
            </h1>
            <p style={{ fontSize: 16, opacity: 0.8, maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              Stay informed about GKAC elections — view schedules, candidates, and results for all club elections.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* IMPORTANT NOTICE                                */}
        {/* ════════════════════════════════════════════════ */}
        <div className="card" style={{
          marginBottom: "var(--space-4)",
          background: "linear-gradient(135deg, #fef9e7 0%, #fdf2d7 100%)",
          border: "1px solid #f0d78c",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}>
          <div style={{
            fontSize: 24, flexShrink: 0, lineHeight: 1, marginTop: 2,
          }}>⚠️</div>
          <div>
            <p style={{ fontWeight: 700, margin: "0 0 6px", fontSize: 15, color: "#8b6914" }}>
              2026-2028 ELECTION PROCESS — IMPORTANT NOTICE
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "#6b4f0e", lineHeight: 1.6 }}>
              The Electoral Committee has kick-started the Year 2026-2028 Election Process.
              Payment of all allotted fees validates eligibility to be voted for.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════ */}
        {/* ELECTION TIMELINE                               */}
        {/* ════════════════════════════════════════════════ */}
        <div style={{
          maxWidth: 800, margin: "0 auto var(--space-4)",
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
            fontWeight: 700, fontSize: 15,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            📅 Election Calendar — Key Dates
          </div>
          <div style={{ padding: "16px 24px" }}>
            {ELECTION_TIMELINE.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", gap: 16,
                padding: "14px 0",
                borderBottom: idx < ELECTION_TIMELINE.length - 1 ? "1px solid var(--border)" : "none",
                opacity: item.status === "active" ? 1 : 0.75,
              }}>
                {/* Timeline indicator */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: "50%",
                    background: item.status === "active" ? "var(--accent)" : "var(--muted)",
                    border: item.status === "active" ? "3px solid oklch(65% 0.15 40 / 0.3)" : "none",
                    flexShrink: 0,
                  }} />
                  {idx < ELECTION_TIMELINE.length - 1 && (
                    <div style={{ width: 2, flex: 1, minHeight: 24, background: "var(--border)" }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: "inline-block",
                    fontSize: 12, fontWeight: 700, color: "#fff",
                    background: item.status === "active" ? "var(--accent)" : "var(--muted)",
                    padding: "2px 10px", borderRadius: 10,
                    marginBottom: 6,
                  }}>
                    {item.date}
                  </div>
                  <h4 style={{
                    fontSize: 15, margin: "2px 0 4px",
                    color: item.status === "active" ? "var(--accent)" : "var(--fg)",
                  }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
                    {item.description}
                  </p>
                  {item.time && (
                    <p style={{ fontWeight: 600, fontSize: 13, marginTop: 6, color: "var(--accent)" }}>
                      🕐 {item.time}
                    </p>
                  )}
                  {item.status === "active" && (
                    <span className="status-badge status-active" style={{ marginTop: 6, display: "inline-block", fontSize: 11 }}>
                      ● Active Now
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          textAlign: "center", marginBottom: "var(--space-4)",
          display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
        }}>
          <Link href="/dashboard/elections" className="btn btn-accent btn-lg" style={{
            borderRadius: "var(--radius-md)", fontWeight: 700,
            padding: "12px 28px", fontSize: 15,
          }}>
            📝 Declaration of Interest
          </Link>
          <Link href="/dashboard/elections" className="btn btn-outline btn-lg" style={{
            borderRadius: "var(--radius-md)", fontWeight: 600,
            padding: "12px 28px", fontSize: 15,
          }}>
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
        <div style={{
          background: "var(--surface)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)", overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 24px", borderBottom: "1px solid var(--border)",
            background: "var(--bg)",
          }}>
            <div className="tabs" style={{ margin: 0 }}>
              <button className={`tab-btn${activeTab === "active" ? " active" : ""}`} onClick={() => setActiveTab("active")}>
                🗳️ Active {activeElections.length > 0 && <span className="badge badge-active" style={{ marginLeft: 6 }}>{activeElections.length}</span>}
              </button>
              <button className={`tab-btn${activeTab === "upcoming" ? " active" : ""}`} onClick={() => setActiveTab("upcoming")}>
                📅 Upcoming
              </button>
              <button className={`tab-btn${activeTab === "past" ? " active" : ""}`} onClick={() => setActiveTab("past")}>
                📊 Past Results
              </button>
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
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
          <div className="modal" style={{ maxWidth: 520, borderRadius: "var(--radius-lg)" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setDetailElection(null)}>✕</button>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ marginBottom: 6, fontSize: 20 }}>{detailElection.title}</h3>
              <span className={`status-badge ${getStatusClass(detailElection.status)}`} style={{ fontSize: 12 }}>
                ● {getStatusLabel(detailElection.status)}
              </span>
            </div>
            {detailElection.description && (
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                {detailElection.description}
              </p>
            )}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
              fontSize: 14, background: "var(--bg)", padding: 16,
              borderRadius: "var(--radius-md)",
            }}>
              {detailElection.start_date && (
                <>
                  <span style={{ color: "var(--muted)" }}>Voting opens</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{formatDate(detailElection.start_date)}</span>
                </>
              )}
              {detailElection.end_date && (
                <>
                  <span style={{ color: "var(--muted)" }}>Voting closes</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{formatDate(detailElection.end_date)}</span>
                </>
              )}
              <>
                <span style={{ color: "var(--muted)" }}>Positions</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{detailElection.positions_count}</span>
              </>
              {detailElection.status !== "draft" && detailElection.status !== "upcoming" && (
                <>
                  <span style={{ color: "var(--muted)" }}>Total votes</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{detailElection.total_votes}</span>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              {(detailElection.status === "active" || detailElection.status === "closed") && (
                <button className="btn btn-accent" style={{ flex: 1, borderRadius: "var(--radius-md)" }}
                  onClick={() => { setDetailElection(null); openResults(detailElection.id); }}>
                  📊 View Results
                </button>
              )}
              <button className="btn btn-ghost" style={{ borderRadius: "var(--radius-md)" }}
                onClick={() => setDetailElection(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULTS MODAL ═══ */}
      {results && (
        <div className="modal-overlay open" onClick={() => setResults(null)}>
          <div className="modal" style={{ maxWidth: 600, maxHeight: "90vh", borderRadius: "var(--radius-lg)" }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setResults(null)}>✕</button>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 4, fontSize: 20 }}>{results.election.title}</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                Status: <strong style={{ color: results.election.status === "active" ? "var(--success)" : "var(--fg)" }}>
                  {results.election.status.toUpperCase()}
                </strong>
              </p>
            </div>

            {/* Summary cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
              marginBottom: 20,
            }}>
              <div style={{
                padding: "14px 12px", borderRadius: "var(--radius-md)",
                background: "var(--bg)", textAlign: "center",
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{results.summary.eligibleVoters}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Eligible</div>
              </div>
              <div style={{
                padding: "14px 12px", borderRadius: "var(--radius-md)",
                background: "var(--green-light)", textAlign: "center",
                border: "1px solid var(--green)",
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, color: "var(--success)" }}>{results.summary.totalVoters}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Voted</div>
              </div>
              <div style={{
                padding: "14px 12px", borderRadius: "var(--radius-md)",
                background: "var(--bg)", textAlign: "center",
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2 }}>{results.summary.turnoutPercentage}%</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Turnout</div>
                <div className="progress-bar" style={{ marginTop: 6, height: 4 }}>
                  <div className="fill" style={{ width: `${results.summary.turnoutPercentage}%` }} />
                </div>
              </div>
            </div>

            {/* Positions */}
            <div style={{ maxHeight: "50vh", overflowY: "auto", paddingRight: 4 }}>
              {results.positions.map((pos) => {
                const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
                return (
                  <div key={pos.id} style={{
                    marginBottom: 16, borderBottom: "1px solid var(--border)",
                    paddingBottom: 14,
                  }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 10,
                    }}>
                      <h4 style={{ fontSize: 15, margin: 0 }}>{pos.title}</h4>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        {pos.totalVotes} vote{pos.totalVotes !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {sorted.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                        No candidates for this position.
                      </p>
                    ) : (
                      sorted.map((c, i) => (
                        <div key={c.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", marginBottom: 6,
                          background: i === 0 && pos.totalVotes > 0 ? "var(--green-light)" : "var(--bg)",
                          borderRadius: "var(--radius-md)",
                          border: i === 0 && pos.totalVotes > 0 ? "1px solid var(--green)" : "1px solid var(--border)",
                          transition: "all 0.2s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, minWidth: 0, flex: 1 }}>
                            {c.photoUrl ? (
                              <img
                                src={api.getCandidatePhotoUrl(c.photoUrl)}
                                alt={`${c.firstName} ${c.lastName}`}
                                style={{
                                  width: 32, height: 32, borderRadius: "50%",
                                  objectFit: "cover", flexShrink: 0,
                                  border: "2px solid var(--border)",
                                }}
                              />
                            ) : (
                              <span style={{
                                width: 32, height: 32, borderRadius: "50%",
                                background: "var(--accent)", color: "#fff",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 700, flexShrink: 0,
                              }}>
                                {c.firstName?.[0]}{c.lastName?.[0]}
                              </span>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</span>
                              {i === 0 && results.election.status === "closed" && pos.totalVotes > 0 && (
                                <span className="badge badge-active" style={{ marginLeft: 6, fontSize: 10 }}>🏆 Winner</span>
                              )}
                              {i === 0 && results.election.status === "active" && pos.totalVotes > 0 && (
                                <span className="badge badge-active" style={{ marginLeft: 6, fontSize: 10 }}>Leading</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                            <strong style={{ fontSize: 16 }}>{c.voteCount}</strong>
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
            </div>

            <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8, borderRadius: "var(--radius-md)" }}
              onClick={() => setResults(null)}>
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
    <div className="card" style={{
      marginBottom: 16,
      borderRadius: "var(--radius-md)",
      border: `1px solid ${election.status === "active" ? "var(--green)" : "var(--border)"}`,
      background: election.status === "active" ? "linear-gradient(135deg, var(--green-light) 0%, var(--surface) 100%)" : "var(--surface)",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <strong style={{ fontSize: 17, lineHeight: 1.3 }}>{election.title}</strong>
            {election.status === "active" && (
              <span className="status-badge status-active" style={{ fontSize: 11 }}>● Live</span>
            )}
          </div>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            🗓 {election.start_date && formatDateShort(election.start_date)}
            {election.end_date && ` — ${formatDateShort(election.end_date)}`}
          </span>
        </div>
        <span className={`status-badge ${getStatusClass(election.status)}`} style={{ fontSize: 12, flexShrink: 0 }}>
          ● {getStatusLabel(election.status)}
        </span>
      </div>

      {election.description && (
        <p style={{ fontSize: 14, marginTop: 10, color: "var(--muted)", lineHeight: 1.5 }}>
          {election.description}
        </p>
      )}

      {/* Stats row */}
      <div style={{
        display: "flex", gap: 20, marginTop: 12,
        fontSize: 13, color: "var(--muted)", flexWrap: "wrap",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "var(--fg)", fontSize: 15 }}>{election.positions_count || 0}</span> positions
        </span>
        {election.status !== "draft" && (
          <>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontWeight: 700, color: "var(--fg)", fontSize: 15 }}>{election.total_votes || 0}</span> votes cast
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontWeight: 700, color: "var(--fg)", fontSize: 15 }}>{election.eligible_voters || 0}</span> eligible voters
            </span>
          </>
        )}
      </div>

      {/* Positions & Candidates */}
      {(election.status === "upcoming" || election.status === "active") && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, color: "var(--muted)" }}>
            🏛️ Candidates by Position
          </h4>
          {candidatesLoading ? (
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "12px 0" }}>
              <span className="loader-dot" />
            </p>
          ) : candidates && candidates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(positions).map(([positionTitle, posCandidates]) => (
                <div key={positionTitle} style={{
                  background: "var(--bg)", borderRadius: "var(--radius-md)",
                  padding: "12px 14px", border: "1px solid var(--border)",
                }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14, marginBottom: 8,
                    color: "var(--accent)", display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {positionTitle}
                    <span style={{
                      fontWeight: 400, fontSize: 11, color: "var(--muted)",
                      background: "var(--surface)", padding: "1px 8px",
                      borderRadius: 8, border: "1px solid var(--border)",
                    }}>
                      {posCandidates.length} candidate{posCandidates.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {posCandidates.map((c) => {
                      const photoSrc = c.photo_url ? api.getCandidatePhotoUrl(c.photo_url) : null;
                      return (
                      <span key={c.id} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "5px 12px 5px 5px", borderRadius: 20,
                        background: "var(--surface)", border: "1px solid var(--border)",
                        fontSize: 13, transition: "box-shadow 0.2s",
                      }}>
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={`${c.first_name} ${c.last_name}`}
                            style={{
                              width: 24, height: 24, borderRadius: "50%",
                              objectFit: "cover", flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: "var(--accent)", color: "#fff",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                          }}>
                            {c.first_name?.[0]}{c.last_name?.[0]}
                          </span>
                        )}
                        {c.first_name} {c.last_name}
                      </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: "16px",
              background: "var(--bg)", borderRadius: "var(--radius-md)",
            }}>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, fontStyle: "italic" }}>
                No candidates have been qualified yet. Check back later.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-outline" onClick={onViewDetails}
          style={{ borderRadius: "var(--radius-md)" }}
        >
          📄 View Details
        </button>
        {(election.status === "active" || election.status === "closed") && (
          <button className="btn btn-sm btn-accent" onClick={onViewResults}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            📊 View Results
          </button>
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


