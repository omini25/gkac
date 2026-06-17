"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { api, type Category } from "@/lib/api";

function togglePassword(inputId: string, btn: HTMLElement) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  btn.textContent = input.type === "password" ? "👁" : "🙈";
}

// ── Nigerian states & LGAs ─────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const LGA_MAP: Record<string, string[]> = {
  Lagos: ["Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa",
    "Badagry", "Epe", "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja",
    "Ikorodu", "Kosofe", "Lagos Island", "Lagos Mainland", "Mushin",
    "Ojo", "Oshodi-Isolo", "Somolu", "Surulere"],
  "FCT (Abuja)": ["Abaji", "Bwari", "Gwagwalada", "Kuje", "Kwali", "Municipal Area Council"],
};

function getLGAs(state: string): string[] {
  return LGA_MAP[state] || [`${state} (All LGAs)`];
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  // Form data
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    dateOfBirth: "", gender: "", stateOfOrigin: "", lga: "",
    residentialAddress: "", passportPhoto: null as File | null,
    hasNIN: true, nin: "", altIDType: "", altIDNum: "",
    categoryId: "", referralName: "",
    password: "", confirmPassword: "",
  });

  const [regResult, setRegResult] = useState<{
    userId: string; feeKobo: number; email: string;
    paymentId?: string; reference?: string;
    bankDetails?: { bankName: string; accountName: string; accountNumber: string; sortCode: string; referencePrefix: string };
  } | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    api.getCategories().then((res) => {
      if (res.data) setCategories(res.data.categories);
    });
  }, []);

  function showToast(msg: string, type = "") {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  function updateField(field: string, value: string | boolean | File | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required.";
    if (!form.lastName.trim()) e.lastName = "Required.";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Valid email required.";
    if (!form.phone.trim()) e.phone = "Required.";
    if (!form.dateOfBirth) e.dateOfBirth = "Required.";
    if (!form.gender) e.gender = "Select your gender.";
    if (!form.stateOfOrigin) e.stateOfOrigin = "Select your state.";
    if (!form.lga) e.lga = "Select your LGA.";
    if (!form.residentialAddress.trim()) e.residentialAddress = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!form.password || form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      e.password = "Min 8 chars with a letter and a number.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (!form.categoryId) e.categoryId = "Select a membership category.";
    if (form.hasNIN && (!form.nin || !/^\d{11}$/.test(form.nin)))
      e.nin = "Enter a valid 11-digit NIN.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleStep2Submit() {
    if (!validateStep2()) return;
    setSubmitting(true);
    setApiError("");

    const res = await api.register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      stateOfOrigin: form.stateOfOrigin,
      lga: form.lga,
      residentialAddress: form.residentialAddress,
      hasNIN: form.hasNIN,
      nin: form.nin || undefined,
      altIDType: form.altIDType || undefined,
      altIDNum: form.altIDNum || undefined,
      categoryId: form.categoryId,
      referralName: form.referralName || undefined,
      password: form.password,
    });

    if (res.error) {
      setSubmitting(false);
      setApiError(res.error);
      return;
    }

    if (res.data) {
      const userId = res.data.user.id;
      const feeKobo = res.data.feeKobo;
      const email = form.email;

      // Initialize payment record (get bank details + payment ID)
      const payRes = await api.initializePayment(userId, feeKobo, email);
      setSubmitting(false);

      if (payRes.error) {
        setApiError(payRes.error);
        return;
      }

      if (payRes.data) {
        setRegResult({
          userId,
          feeKobo,
          email,
          paymentId: payRes.data.paymentId,
          reference: payRes.data.reference,
          bankDetails: payRes.data.bankDetails,
        });
        setCurrentStep(3);
      }
    }
  }

  async function handleUploadProof() {
    if (!regResult?.paymentId || !proofFile) return;
    setUploading(true);
    setApiError("");

    const res = await api.uploadPaymentProof(regResult.userId, regResult.paymentId, proofFile);
    setUploading(false);

    if (res.error) {
      setApiError(res.error);
      return;
    }

    if (res.data) {
      setUploadDone(true);
      showToast("Proof uploaded! Application pending review.", "success");
    }
  }

  // ── Success after proof upload ──────────────────────────────────────────
  if (uploadDone) {
    return (
      <div className="auth-page">
        <div className="auth-bg" aria-hidden="true" />
        <div className="auth-wrapper">
          <div className="auth-brand">
            <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
            <h2>Global Kegite Archaverians Club</h2>
            <p>Member Access Portal</p>
          </div>
          <div className="auth-card">
            <div className="auth-success">
              <div className="success-icon">✅</div>
              <h3>Application Submitted!</h3>
              <p>Your proof of payment has been uploaded. Your application is now pending admin review.</p>
              <div className="success-card">
                <strong>What happens next?</strong>
                <ul>
                  <li>Your application is marked as <strong>Pending Approval</strong></li>
                  <li>Admin reviews your payment proof and application details</li>
                  <li>On approval: your digital membership card will be generated</li>
                  <li>You&apos;ll receive a welcome email with login credentials</li>
                  <li>Membership expires 12 months from approval date — renew annually</li>
                </ul>
              </div>
              <Link href="/login" className="btn btn-primary">Go to Sign In</Link>
            </div>
          </div>
          <div className="auth-back">
            <Link href="/">← Back to Public Website</Link>
          </div>
        </div>
        {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-wrapper">
        <div className="auth-brand">
          <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
          <h2>Global Kegite Archaverians Club</h2>
          <p>Member Access Portal</p>
        </div>

        <div className="auth-card">
          {/* ── Step indicator with labels ── */}
          <div style={{ marginBottom: "28px" }}>
            <div className="step-indicator">
              <div className="step-item">
                <span className={`step-dot${currentStep >= 1 ? " active" : ""}${currentStep > 1 ? " done" : ""}`}>
                  {currentStep > 1 ? "✓" : ""}
                </span>
              </div>
              <span className={`step-line${currentStep >= 2 ? " done" : ""}`} />
              <div className="step-item">
                <span className={`step-dot${currentStep >= 2 ? " active" : ""}${currentStep > 2 ? " done" : ""}`}>
                  {currentStep > 2 ? "✓" : ""}
                </span>
              </div>
              <span className={`step-line${currentStep >= 3 ? " done" : ""}`} />
              <div className="step-item">
                <span className={`step-dot${currentStep >= 3 ? " active" : ""}`}>
                  {currentStep > 3 ? "✓" : ""}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
              <span className={`step-label${currentStep >= 1 ? " active" : ""}${currentStep > 1 ? " done" : ""}`}>Profile</span>
              <span className={`step-label${currentStep >= 2 ? " active" : ""}${currentStep > 2 ? " done" : ""}`}>Account</span>
              <span className={`step-label${currentStep >= 3 ? " active" : ""}`}>Payment</span>
            </div>
          </div>

          {apiError && (
            <div className="notice-banner" style={{ background: "var(--red-bg)", borderColor: "var(--error)", color: "var(--error)" }}>
              <span>⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          {/* ═══════════════ STEP 1: Personal Information ═══════════════ */}
          {currentStep === 1 && (
            <div className="reg-step active">
              <h3 style={{ marginBottom: 16 }}>Step 1 — Personal Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regFirstName">First Name *</label>
                  <input id="regFirstName" type="text" required placeholder="Your first name"
                    value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                  <span className={`form-error${errors.firstName ? " visible" : ""}`}>{errors.firstName}</span>
                </div>
                <div className="form-group">
                  <label htmlFor="regLastName">Last Name *</label>
                  <input id="regLastName" type="text" required placeholder="Your last name"
                    value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                  <span className={`form-error${errors.lastName ? " visible" : ""}`}>{errors.lastName}</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="regEmail">Email Address *</label>
                <input id="regEmail" type="email" required placeholder="your.email@example.com" autoComplete="email"
                  value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                <span className={`form-error${errors.email ? " visible" : ""}`}>{errors.email}</span>
              </div>
              <div className="form-group">
                <label htmlFor="regPhone">Phone Number *</label>
                <input id="regPhone" type="tel" required placeholder="+234 800 000 0000"
                  value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                <span className={`form-error${errors.phone ? " visible" : ""}`}>{errors.phone}</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regDOB">Date of Birth *</label>
                  <input id="regDOB" type="date" required
                    value={form.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} />
                  <span className={`form-error${errors.dateOfBirth ? " visible" : ""}`}>{errors.dateOfBirth}</span>
                </div>
                <div className="form-group">
                  <label htmlFor="regGender">Gender *</label>
                  <select id="regGender" required value={form.gender} onChange={(e) => updateField("gender", e.target.value)}>
                    <option value="">Select gender…</option>
                    <option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select>
                  <span className={`form-error${errors.gender ? " visible" : ""}`}>{errors.gender}</span>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regState">State of Origin *</label>
                  <select id="regState" required value={form.stateOfOrigin}
                    onChange={(e) => { updateField("stateOfOrigin", e.target.value); updateField("lga", ""); }}>
                    <option value="">Select state…</option>
                    {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <span className={`form-error${errors.stateOfOrigin ? " visible" : ""}`}>{errors.stateOfOrigin}</span>
                </div>
                <div className="form-group">
                  <label htmlFor="regLGA">LGA *</label>
                  <select id="regLGA" required value={form.lga}
                    onChange={(e) => updateField("lga", e.target.value)} disabled={!form.stateOfOrigin}>
                    <option value="">Select LGA…</option>
                    {form.stateOfOrigin && getLGAs(form.stateOfOrigin).map((l) => <option key={l}>{l}</option>)}
                  </select>
                  <span className={`form-error${errors.lga ? " visible" : ""}`}>{errors.lga}</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="regAddress">Residential Address *</label>
                <textarea id="regAddress" required placeholder="Your full residential address" rows={3}
                  value={form.residentialAddress} onChange={(e) => updateField("residentialAddress", e.target.value)} />
                <span className={`form-error${errors.residentialAddress ? " visible" : ""}`}>{errors.residentialAddress}</span>
              </div>
              <div className="form-group">
                <label htmlFor="regPhoto">Passport Photograph</label>
                <input id="regPhoto" type="file" accept="image/jpeg,image/png"
                  onChange={(e) => updateField("passportPhoto", e.target.files?.[0] || null)} />
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>JPG/PNG, max 2MB — used on your membership card</div>
              </div>
              <button type="button" className="btn btn-accent" onClick={() => { if (validateStep1()) setCurrentStep(2); }}>
                Continue
              </button>
            </div>
          )}

          {/* ═══════════════ STEP 2: Account & Identity ═══════════════ */}
          {currentStep === 2 && (
            <div className="reg-step active">
              <h3 style={{ marginBottom: 12 }}>Step 2 — Account &amp; Identity</h3>

              <div className="form-group">
                <label htmlFor="regPassword">Password *</label>
                <div className="input-icon">
                  <input type="password" id="regPassword" required placeholder="Minimum 8 characters" minLength={8} autoComplete="new-password"
                    value={form.password} onChange={(e) => updateField("password", e.target.value)} />
                  <button type="button" className="toggle-pw" onClick={(e) => togglePassword("regPassword", e.currentTarget)} aria-label="Toggle">👁</button>
                </div>
                <span className={`form-error${errors.password ? " visible" : ""}`}>{errors.password}</span>
              </div>
              <div className="form-group">
                <label htmlFor="regConfirmPassword">Confirm Password *</label>
                <input type="password" id="regConfirmPassword" required placeholder="Re-enter your password" autoComplete="new-password"
                  value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} />
                <span className={`form-error${errors.confirmPassword ? " visible" : ""}`}>{errors.confirmPassword}</span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "18px 0" }} />
              <h4 style={{ marginBottom: 12, fontSize: 16 }}>Identity Verification</h4>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                We use your NIN to verify your identity. Without it, manual review is required (up to 15 working days).
              </p>
              <div className="nin-toggle">
                <button type="button" className={form.hasNIN ? "active" : ""} onClick={() => updateField("hasNIN", true)}>I have my NIN</button>
                <button type="button" className={!form.hasNIN ? "active" : ""} onClick={() => updateField("hasNIN", false)}>I don&apos;t have my NIN</button>
              </div>
              <div style={{ display: form.hasNIN ? "" : "none" }}>
                <div className="form-group">
                  <label htmlFor="regNIN">National Identification Number (NIN) *</label>
                  <input type="text" id="regNIN" placeholder="11-digit NIN" maxLength={11} inputMode="numeric"
                    value={form.nin} onChange={(e) => updateField("nin", e.target.value.replace(/\D/g, ""))} />
                  <span className={`form-error${errors.nin ? " visible" : ""}`}>{errors.nin}</span>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Verified against NIMC database. Encrypted and stored securely.</div>
                </div>
              </div>

              <div style={{ display: form.hasNIN ? "none" : "" }}>
                <div className="notice-banner" style={{ marginBottom: 16 }}>
                  <span>⚠️</span>
                  <span>Proceeding without NIN means manual identity verification — may take up to 15 working days.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="regAltID">Alternative ID Type</label>
                  <select id="regAltID" value={form.altIDType} onChange={(e) => updateField("altIDType", e.target.value)}>
                    <option value="">Select ID type…</option>
                    <option>International Passport</option>
                    <option>Driver&apos;s Licence</option>
                    <option>Voter&apos;s Card</option>
                    <option>BVN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="regAltIDNum">Alternative ID Number</label>
                  <input type="text" id="regAltIDNum" placeholder="Enter your ID number"
                    value={form.altIDNum} onChange={(e) => updateField("altIDNum", e.target.value)} />
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "18px 0" }} />

              <div className="form-group">
                <label htmlFor="regCategory">Membership Category *</label>
                <select id="regCategory" required value={form.categoryId} onChange={(e) => updateField("categoryId", e.target.value)}>
                  <option value="">Select your category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.description} (₦{(c.fee_kobo / 100).toLocaleString()})</option>
                  ))}
                </select>
                <span className={`form-error${errors.categoryId ? " visible" : ""}`}>{errors.categoryId}</span>
              </div>

              <div className="form-group">
                <label htmlFor="regReferral">Referral / Sponsor (optional)</label>
                <input type="text" id="regReferral" placeholder="Member name or code who referred you"
                  value={form.referralName} onChange={(e) => updateField("referralName", e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(1)}>← Back</button>
                <button type="button" className="btn btn-accent" disabled={submitting} onClick={handleStep2Submit}>
                  {submitting ? "Creating account…" : "Review &amp; Pay"}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: Review & Pay via Bank Transfer ═══════════════ */}
          {currentStep === 3 && regResult && (
            <div className="reg-step active">
              <h3 style={{ marginBottom: 12 }}>Step 3 — Review &amp; Pay</h3>

              <div className="review-list">
                <div className="review-row"><span className="review-label">Full Name</span><strong className="review-value">{form.firstName} {form.lastName}</strong></div>
                <div className="review-row"><span className="review-label">Email</span><strong className="review-value">{form.email}</strong></div>
                <div className="review-row"><span className="review-label">Phone</span><strong className="review-value">{form.phone}</strong></div>
                <div className="review-row"><span className="review-label">Category</span><strong className="review-value">{selectedCategory?.name}</strong></div>
                <div className="review-row"><span className="review-label">Identity</span><strong className="review-value">{form.hasNIN ? `NIN: ${form.nin}` : form.altIDType || "Manual review"}</strong></div>
              </div>

              {selectedCategory && (
                <div style={{ background: "var(--green-bg)", border: "1px solid var(--accent)", borderRadius: "var(--radius-md)", padding: 16, marginBottom: 18, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Membership Fee (Annual)</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "var(--green-dark)" }}>₦{(selectedCategory.fee_kobo / 100).toLocaleString()}</div>
                </div>
              )}

              {/* ── Bank Transfer Details ── */}
              {regResult.bankDetails && (
                <div style={{
                  background: "var(--surface)", border: "2px solid var(--green)",
                  borderRadius: "var(--radius-lg)", padding: "20px 24px",
                  marginBottom: "20px",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "16px",
                  }}>
                    <span style={{ fontSize: "20px" }}>🏦</span>
                    <strong style={{ fontSize: "15px", color: "var(--green-dark)" }}>
                      Bank Transfer Details
                    </strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Bank</span>
                      <strong>{regResult.bankDetails.bankName}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Account Name</span>
                      <strong>{regResult.bankDetails.accountName}</strong>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      background: "var(--green-light)", padding: "8px 12px",
                      borderRadius: "var(--radius-sm)", margin: "4px -8px",
                    }}>
                      <span style={{ color: "var(--muted)" }}>Account Number</span>
                      <strong style={{ fontFamily: "var(--font-mono)", fontSize: "17px", letterSpacing: "0.04em", color: "var(--green-dark)" }}>
                        {regResult.bankDetails.accountNumber}
                      </strong>
                    </div>
                    {regResult.bankDetails.sortCode && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)" }}>Sort Code</span>
                        <strong>{regResult.bankDetails.sortCode}</strong>
                      </div>
                    )}
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      borderTop: "1px solid var(--border)", paddingTop: "10px",
                    }}>
                      <span style={{ color: "var(--muted)" }}>Payment Reference</span>
                      <strong style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--accent)" }}>
                        {regResult.reference}
                      </strong>
                    </div>
                  </div>
                  <p style={{
                    fontSize: "12px", color: "var(--muted)", marginTop: "14px",
                    marginBottom: 0, lineHeight: "1.5",
                  }}>
                    Please use your <strong>Payment Reference</strong> as the transfer narration.
                    After making the transfer, upload your proof of payment below.
                  </p>
                </div>
              )}

              {/* ── Upload Proof of Payment ── */}
              <div style={{
                background: "var(--bg)", border: "2px dashed var(--border-strong)",
                borderRadius: "var(--radius-lg)", padding: "24px",
                textAlign: "center", marginBottom: "18px",
                transition: "border-color .2s",
                ...(proofFile ? { borderColor: "var(--accent)", background: "var(--green-bg)" } : {}),
              }}>
                {proofFile ? (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📎</div>
                    <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      {proofFile.name}
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {(proofFile.size / 1024).toFixed(1)} KB
                    </span>
                    <div style={{ marginTop: "10px" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setProofFile(null)}
                        style={{ fontSize: "13px", color: "var(--error)" }}
                      >
                        Remove &amp; choose another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "32px", marginBottom: "8px" }}>📤</div>
                    <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      Upload Proof of Payment
                    </strong>
                    <span style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginBottom: "12px" }}>
                      Screenshot or PDF of your bank transfer — JPG, PNG, or PDF (max 5 MB)
                    </span>
                    <label className="btn btn-outline btn-sm" style={{ cursor: "pointer", fontSize: "14px" }}>
                      Choose File
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-accent"
                disabled={uploading || !proofFile}
                onClick={handleUploadProof}
              >
                {uploading ? "Uploading proof…" : "Submit Proof of Payment"}
              </button>

              <p style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", marginTop: "12px", lineHeight: "1.5" }}>
                After uploading, your application will be reviewed by an administrator.{" "}
                <strong>Approval typically takes 1–3 working days.</strong>
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-outline" onClick={() => setCurrentStep(2)}>← Back</button>
              </div>
            </div>
          )}
        </div>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Sign in</Link>
        </div>

        <div className="auth-back">
          <Link href="/">← Back to Public Website</Link>
        </div>
      </div>
      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
