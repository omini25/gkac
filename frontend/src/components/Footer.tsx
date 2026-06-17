import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div style={{ gridColumn: "span 1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "var(--space-2)" }}>
              <img src="/gkac-logo.png" alt="GKAC" style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "contain" }} />
              <h4 style={{ margin: 0, fontSize: "18px" }}>Global Kegite Archaverians Club</h4>
            </div>
            <p style={{ color: "oklch(80% 0.015 65)", fontSize: "14px", lineHeight: "1.7", marginBottom: 0, maxWidth: "320px" }}>
              A distinguished international fraternal organisation fostering brotherhood, leadership, and community development since 1979.
            </p>
          </div>
          <div>
            <h4>Organisation</h4>
            <ul>
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/leadership">Leadership</Link></li>
              <li><Link href="/constitution">Constitution</Link></li>
              <li><Link href="/elections">Elections</Link></li>
            </ul>
          </div>
          <div>
            <h4>Members</h4>
            <ul>
              <li><Link href="/membership">Join GKAC</Link></li>
              <li><Link href="/verification">Verify Membership</Link></li>
              <li><Link href="/login">Member Portal</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><a href="mailto:info@gkaclub.org">info@gkaclub.org</a></li>
              <li><a href="tel:+2348000000000">+234 800 000 0000</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p style={{ color: "oklch(80% 0.015 65)", fontSize: "13px", margin: 0 }}>
            &copy; {new Date().getFullYear()} Global Kegite Archaverians Club. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
