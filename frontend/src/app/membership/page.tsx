import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Membership",
};

const MEMBERSHIP_CATEGORIES = [
  { cat: "Fellow", eligibility: "15+ years of distinguished practice, nominated by peers", dues: "₦75,000", voting: "Full" },
  { cat: "Full Member", eligibility: "5+ years of professional practice, certified qualification", dues: "₦35,000", voting: "Full" },
  { cat: "Associate", eligibility: "2+ years post-qualification experience", dues: "₦20,000", voting: "Limited" },
  { cat: "Graduate", eligibility: "Recent graduates (within 3 years) of accredited programmes", dues: "₦8,000", voting: "None" },
  { cat: "Student", eligibility: "Currently enrolled in an accredited tertiary programme", dues: "₦2,000", voting: "None" },
  { cat: "Corporate", eligibility: "Organisations employing 10+ GKAC-registered members", dues: "₦250,000", voting: "Institutional" },
];

const BENEFITS = [
  "GKAC certification and designation",
  "Access to global conferences and chapter events",
  "Leadership Development Programmes",
  "Digital membership card with worldwide verification",
  "Listing in the Global GKAC Directory",
  "Access to the member resource library",
  "Voting rights in Club elections (Full Member and above)",
  "Networking opportunities with industry leaders",
];

const STEPS = [
  { title: "Create Account", desc: "Register online with your email and professional details." },
  { title: "Submit Documents", desc: "Upload your qualifications and supporting credentials." },
  { title: "Application Review", desc: "Our membership committee reviews your application within 10 working days." },
  { title: "Pay Dues", desc: "Make payment for your category and activate your membership." },
];

export default function MembershipPage() {
  return (
    <div className="page-section">
      <div className="container">
        <div className="section-header">
          <h2>Membership Information</h2>
          <p>Choose the category that fits your stage and enjoy the full benefits of GKAC membership.</p>
        </div>

        {/* Categories Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="fee-table">
            <thead>
              <tr><th>Category</th><th>Eligibility</th><th>Annual Dues</th><th>Voting Rights</th></tr>
            </thead>
            <tbody>
              {MEMBERSHIP_CATEGORIES.map((m) => (
                <tr key={m.cat}>
                  <td><strong>{m.cat}</strong></td>
                  <td>{m.eligibility}</td>
                  <td>{m.dues}</td>
                  <td>{m.voting}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Benefits */}
        <h3 style={{ marginTop: "var(--space-5)" }}>Member Benefits</h3>
        <ul className="benefit-list" style={{ marginTop: "var(--space-2)" }}>
          {BENEFITS.map((b) => (
            <li key={b}><span className="check">✓</span> {b}</li>
          ))}
        </ul>

        {/* How to Join */}
        <h3 style={{ marginTop: "var(--space-5)", textAlign: "center" }}>How to Join</h3>
        <div className="steps" style={{ marginTop: "var(--space-3)" }}>
          {STEPS.map((s) => (
            <div key={s.title} className="step-card">
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <Link href="/register" className="btn btn-accent btn-lg">
            Start Your Application
          </Link>
        </div>
      </div>
    </div>
  );
}
