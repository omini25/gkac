import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Constitution",
};

const TOC_ITEMS = [
  "Article I — Name, Motto, and Registered Office",
  "Article II — Aims and Objectives",
  "Article III — Membership Categories, Rights, and Obligations",
  "Article IV — The Executive Committee",
  "Article V — Election of Officers",
  "Article VI — Meetings and Quorum",
  "Article VII — Code of Professional Conduct and Discipline",
  "Article VIII — Financial Provisions and Audit",
  "Article IX — State Chapters",
  "Article X — Amendments and Dissolution",
];

export default function ConstitutionPage() {
  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Constitution</h2>
          <p>The governing document of the Global Kegite Archaverians Club — last amended March 2023.</p>
        </div>
        <div className="doc-viewer">
          <h3>Table of Contents</h3>
          <ul className="toc">
            {TOC_ITEMS.map((item) => (
              <li key={item}>
                <a href="#">{item}</a>
              </li>
            ))}
          </ul>
          <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
            <button className="btn btn-primary" type="button">
              📄 Download Full Constitution (PDF)
            </button>
            <p style={{ fontSize: 13, marginTop: 8, color: "var(--muted)" }}>
              PDF · 42 pages · Updated March 2023
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
