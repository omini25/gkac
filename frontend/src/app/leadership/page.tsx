"use client";

import { useState, useEffect } from "react";
import { api, type LeaderItem } from "@/lib/api";

export default function LeadershipPage() {
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getContent<LeaderItem>("leadership").then((res) => {
      if (res.data) setLeaders(res.data.items);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Leadership & Elected Officials</h2>
          <p>Meet the distinguished leaders serving on the GKAC Executive Committee.</p>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}><span className="loader-dot" /></p>
        ) : (
          <div className="grid-3" style={{ marginTop: "var(--space-3)" }}>
            {leaders.map((l) => (
              <div key={l.id} className="profile-card">
                <div className="profile-photo">👤</div>
                <h4>{l.name}</h4>
                <div className="profile-role">{l.role}</div>
                {l.term_label && <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Term: {l.term_label}</div>}
                {l.bio && <p className="profile-bio">{l.bio}</p>}
              </div>
            ))}
            {leaders.length === 0 && <p style={{ textAlign: "center", color: "var(--muted)", gridColumn: "1 / -1" }}>No officials listed yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
