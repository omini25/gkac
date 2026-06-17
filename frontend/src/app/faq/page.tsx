"use client";

import { useState, useEffect } from "react";
import { api, type FaqItem } from "@/lib/api";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    api.getContent<FaqItem>("faq").then((res) => {
      if (res.data) setFaqs(res.data.items);
      setLoading(false);
    });
  }, []);

  const categories = ["all", ...new Set(faqs.map((f) => f.category))];
  const filtered = faqs.filter((f) => activeCat === "all" || f.category === activeCat);

  function toggle(idx: number) {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  }

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Frequently Asked Questions</h2>
          <p>Quick answers to common questions about membership, verification, and GKAC.</p>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--muted)", padding: "40px 0" }}><span className="loader-dot" /></p>
        ) : (
          <>
            <div className="faq-categories">
              {categories.map((c) => (
                <button key={c} className={`faq-cat${activeCat === c ? " active" : ""}`}
                  onClick={() => { setActiveCat(c); setOpenIndex(null); }}>
                  {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <div className="accordion">
              {filtered.map((item, idx) => (
                <div key={item.id} className="accordion-item">
                  <button className={`accordion-btn${openIndex === idx ? " open" : ""}`}
                    aria-expanded={openIndex === idx} onClick={() => toggle(idx)}>
                    {item.question}
                    <span className="arr">▼</span>
                  </button>
                  <div className={`accordion-panel${openIndex === idx ? " open" : ""}`}>
                    <p>{item.answer}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && <p style={{ textAlign: "center", color: "var(--muted)", padding: 32 }}>No FAQ items.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
