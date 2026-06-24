import Link from "next/link";
import AnnouncementsSection from "./components/AnnouncementsSection";

export default function HomePage() {
  return (
    <>
      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero" aria-label="Welcome">
        <div className="container">
          <p style={{
            fontFamily: "var(--font-mono)", fontSize: "13px",
            textTransform: "uppercase", letterSpacing: "0.14em",
            color: "var(--accent)", fontWeight: 700, marginBottom: "var(--space-2)"
          }}>
            Established 1979 — A Tradition of Excellence
          </p>
          <h1>Global Kegite Archaverians Club</h1>
          <p className="hero-sub" style={{ fontSize: "22px", maxWidth: "680px" }}>
            A distinguished international fraternal organisation dedicated to
            developing men of character, integrity, and leadership through
            brotherhood and service.
          </p>
          <div className="hero-actions" style={{ gap: "16px", marginTop: "var(--space-3)" }}>
            <Link href="/register" className="btn btn-accent btn-lg" style={{ fontSize: "18px", padding: "16px 40px" }}>
              Apply for Membership
            </Link>
            <Link href="/verification" className="btn btn-outline btn-lg" style={{ fontSize: "18px", padding: "16px 40px" }}>
              Verify a Member
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-num">1,000</div>
              <div className="stat-label">Membership Number</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">70</div>
              <div className="stat-label">Worldwide Global Members</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">2+</div>
              <div className="stat-label">Countries Represented</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">7+</div>
              <div className="stat-label">Years of Service</div>
            </div>
            <div className="hero-stat">
              <div className="stat-num">20+</div>
              <div className="stat-label">Annual Initiatives</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHO WE ARE ═══════════════ */}
      <section className="page-section section-accent-top" aria-label="Who we are" style={{ background: "var(--green-light)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2>Who We Are</h2>
            <p style={{ fontSize: "19px", maxWidth: "680px" }}>
              A distinguished international socio-cultural organization of Kegites who, many years after graduation, remain committed to the ideals of brotherhood, integrity, leadership, and service.
            </p>
          </div>
          <div className="pillar-grid">
            <div className="pillar-card">
              <div className="pillar-num">01</div>
              <h4>Brotherhood</h4>
              <p>Forging lifelong bonds of mutual respect, support, and camaraderie among members across the globe.</p>
            </div>
            <div className="pillar-card">
              <div className="pillar-num">02</div>
              <h4>Leadership</h4>
              <p>Developing principled leaders who drive positive change in their professions and communities.</p>
            </div>
            <div className="pillar-card">
              <div className="pillar-num">03</div>
              <h4>Service</h4>
              <p>Giving back through impactful community initiatives, charitable programmes, and mentorship.</p>
            </div>
            <div className="pillar-card">
              <div className="pillar-num">04</div>
              <h4>Excellence</h4>
              <p>Upholding the highest standards in all endeavours — academic, professional, and personal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHAT WE OFFER ═══════════════ */}
      <section className="page-section lg" aria-label="What we offer">
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2>What We Offer</h2>
            <p style={{ fontSize: "19px" }}>
              Membership in GKAC unlocks access to a world of opportunities
              designed to enrich your personal and professional life.
            </p>
          </div>
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">🤝</div>
              <div className="feature-text">
                <h4>Global Professional Network</h4>
                <p>Connect with accomplished professionals across industries — from business and law to medicine, engineering, and the arts.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📚</div>
              <div className="feature-text">
                <h4>Leadership Development</h4>
                <p>Access exclusive workshops, seminars, and mentorship programmes designed to accelerate your growth as a leader.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎓</div>
              <div className="feature-text">
                <h4>Educational Support</h4>
                <p>Benefit from scholarships, professional certification funding, and continuous learning resources for members at all stages.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">💼</div>
              <div className="feature-text">
                <h4>Career Advancement</h4>
                <p>Leverage job placement assistance, career counselling, and introductions to industry leaders within the brotherhood.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🌟</div>
              <div className="feature-text">
                <h4>Community Impact</h4>
                <p>Participate in meaningful service projects, charitable drives, and social responsibility initiatives that make a difference.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎉</div>
              <div className="feature-text">
                <h4>Exclusive Events</h4>
                <p>Attend annual conferences, chapter meetings, gala dinners, and networking socials with members from around the world.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ OUR IMPACT — Stats Bar ═══════════════ */}
      <section className="page-section" aria-label="Our impact" style={{ background: "var(--tan-light)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2>Our Impact</h2>
            <p style={{ fontSize: "19px" }}>Numbers that reflect decades of commitment to brotherhood and service.</p>
          </div>
          <div className="stats-bar">
            <div className="stat-card-premium">
              <div className="sp-value">5+</div>
              <div className="sp-label">Continental</div>
            </div>
            <div className="stat-card-premium">
              <div className="sp-value">70+</div>
              <div className="sp-label">Worldwide / Global Members</div>
            </div>
            <div className="stat-card-premium">
              <div className="sp-value">2018</div>
              <div className="sp-label">Year of Service</div>
            </div>
            <div className="stat-card-premium">
              <div className="sp-value">1,000</div>
              <div className="sp-label">Targeted Membership Number</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <section className="page-section lg" aria-label="Testimonials">
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2>What Our Members Say</h2>
            <p style={{ fontSize: "19px" }}>
              Hear from distinguished members about their GKAC experience.
            </p>
          </div>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <blockquote>
                GKAC has been instrumental in my professional growth. The network
                of accomplished individuals I&apos;ve connected with has opened doors
                I never thought possible.
              </blockquote>
              <div className="testimonial-author">
                <div className="ta-avatar">AJ</div>
                <div className="ta-info">
                  <strong>Adebayo Johnson</strong>
                  <span>Senior Partner, Lagos — Member since 2015</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <blockquote>
                The leadership training and mentorship programmes transformed how
                I approach my career and community service. It&apos;s more than a
                club — it&apos;s a lifelong brotherhood.
              </blockquote>
              <div className="testimonial-author">
                <div className="ta-avatar">CO</div>
                <div className="ta-info">
                  <strong>Dr. Chidi Okonkwo</strong>
                  <span>Medical Director, Abuja — Member since 2012</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <blockquote>
                Through GKAC&apos;s scholarship programme, I completed my master&apos;s
                degree abroad. Today I mentor young members and give back to the
                same programme that helped me.
              </blockquote>
              <div className="testimonial-author">
                <div className="ta-avatar">EN</div>
                <div className="ta-info">
                  <strong>Emeka Nwankwo</strong>
                  <span>Engineer, Nairobi — Member since 2018</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MILESTONES ═══════════════ */}
      <section className="page-section" aria-label="Our journey" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-divider" />
            <h2>Our Journey</h2>
            <p style={{ fontSize: "19px" }}>
              Key milestones that have shaped our organisation over four decades.
            </p>
          </div>
          <div className="milestone-timeline">
            <div className="milestone-item">
              <div className="milestone-year">1979</div>
              <h4>Foundation</h4>
              <p>The Global Kegite Archaverians Club was founded with a vision of uniting professionals committed to brotherhood and excellence.</p>
            </div>
            <div className="milestone-item">
              <div className="milestone-year">1985</div>
              <h4>First International Chapter</h4>
              <p>Expansion beyond Nigeria with the inauguration of the London chapter — the first of many international chapters.</p>
            </div>
            <div className="milestone-item">
              <div className="milestone-year">1995</div>
              <h4>Scholarship Programme Launched</h4>
              <p>The GKAC Scholarship Fund was established, providing educational grants to deserving students across member communities.</p>
            </div>
            <div className="milestone-item">
              <div className="milestone-year">2005</div>
              <h4>50 Chapters Milestone</h4>
              <p>GKAC reached 50 active chapters across Africa and the diaspora, solidifying its position as a leading fraternal organisation.</p>
            </div>
            <div className="milestone-item">
              <div className="milestone-year">2015</div>
              <h4>Digital Transformation</h4>
              <p>Launch of the digital membership platform, enabling seamless verification, elections, and resource access for members worldwide.</p>
            </div>
            <div className="milestone-item">
              <div className="milestone-year">2024</div>
              <h4>Global Impact Framework</h4>
              <p>Introduction of the Global Impact Framework, targeting ₦1 billion in community investments by 2030 across education, health, and enterprise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ QUICK LINKS ═══════════════ */}
      <section className="page-section" aria-label="Quick links" style={{ background: "var(--tan-light)" }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: "var(--space-4)" }}>
            <h2>Explore GKAC</h2>
            <p style={{ fontSize: "19px" }}>Everything you need, all in one place.</p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--space-3)",
          }}>
            <div className="card" style={{ padding: "var(--space-4)" }}>
              <div className="card-icon">👥</div>
              <h3 style={{ fontSize: "22px", marginBottom: "var(--space-1)" }}>Membership</h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "var(--space-2)" }}>
                Discover membership tiers, benefits, and the application process.
              </p>
              <Link href="/register" className="btn btn-accent btn-sm" style={{ fontSize: "16px", padding: "12px 28px" }}>
                Start Membership &rarr;
              </Link>
            </div>

            <div className="card" style={{ padding: "var(--space-4)" }}>
              <div className="card-icon">📅</div>
              <h3 style={{ fontSize: "22px", marginBottom: "var(--space-1)" }}>Events</h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "var(--space-2)" }}>
                Stay informed about upcoming conferences, chapter meetings, and social gatherings.
              </p>
              <Link href="/events" className="btn btn-accent btn-sm" style={{ fontSize: "16px", padding: "12px 28px" }}>
                View Events &rarr;
              </Link>
            </div>

            <div className="card" style={{ padding: "var(--space-4)" }}>
              <div className="card-icon">📰</div>
              <h3 style={{ fontSize: "22px", marginBottom: "var(--space-1)" }}>News &amp; Updates</h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "var(--space-2)" }}>
                Read the latest announcements, member achievements, and organisation news.
              </p>
              <Link href="/news" className="btn btn-accent btn-sm" style={{ fontSize: "16px", padding: "12px 28px" }}>
                Read News &rarr;
              </Link>
            </div>
          </div>

          <div style={{
            display: "flex", gap: "12px", flexWrap: "wrap",
            justifyContent: "center", marginTop: "var(--space-4)",
          }}>
            <Link href="/about" className="btn btn-ghost btn-sm">About GKAC</Link>
            <Link href="/leadership" className="btn btn-ghost btn-sm">Our Leadership</Link>
            <Link href="/constitution" className="btn btn-ghost btn-sm">Constitution</Link>
            <Link href="/elections" className="btn btn-ghost btn-sm">Elections</Link>
            <Link href="/faq" className="btn btn-ghost btn-sm">FAQ</Link>
            <Link href="/contact" className="btn btn-ghost btn-sm">Contact Us</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ ANNOUNCEMENTS (dynamic — managed by admin) ═══════════════ */}
      <AnnouncementsSection />

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <section className="page-section section-accent-bottom cta-banner" aria-label="Join us" style={{ background: "var(--green-dark)", padding: "var(--space-8) 0" }}>
        <div className="container" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <h2 style={{ color: "#fff", marginBottom: "var(--space-2)", fontSize: "clamp(28px, 3.5vw, 40px)" }}>
            Ready to become part of something greater?
          </h2>
          <p style={{ color: "oklch(88% 0.015 65)", fontSize: "18px", marginBottom: "var(--space-4)", maxWidth: "600px", margin: "0 auto var(--space-4)" }}>
            Membership is open to qualified individuals who share our values of
            brotherhood, integrity, and service. Applications are reviewed year-round.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-lg"
              style={{ background: "#fff", color: "var(--green-dark)", borderColor: "#fff", fontSize: "18px", padding: "16px 40px" }}>
              Apply for Membership
            </Link>
            <Link href="/login" className="btn btn-lg"
              style={{ background: "transparent", color: "#fff", borderColor: "oklch(100% 0 0 / .3)", fontSize: "18px", padding: "16px 40px" }}>
              Member Sign In
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
