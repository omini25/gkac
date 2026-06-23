const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

interface ApiResult<T> {
  data?: T;
  error?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("gkac_token") : null;

    const isFormData = options.body instanceof FormData;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || `Request failed (${res.status})` };
    }

    return { data: json as T };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

// ─── Auth API ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string;
  fee_kobo: number;
  min_experience_years: number;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  stateOfOrigin: string;
  lga: string;
  residentialAddress: string;
  hasNIN: boolean;
  nin?: string;
  altIDType?: string;
  altIDNum?: string;
  categoryId: string;
  referralName?: string;
  password: string;
}

export interface RegisterResult {
  message: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  feeKobo: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  message: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    membershipCategory: string;
    membershipCode: string;
    applicationStatus: string;
    isVerified: boolean;
    isAdmin: boolean;
    membershipExpiresAt: string;
    passportPhotoUrl: string | null;
    createdAt: string | null;
    forcePasswordChange: boolean;
    annualDevelopmentalFeePaid: boolean;
    annualDuePaid: boolean;
  };
  token: string;
}

export interface PaymentInitResult {
  paymentId: string;
  reference: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode: string;
    referencePrefix: string;
  };
}

export interface PaymentProofResult {
  message: string;
  payment: {
    id: string;
    reference: string;
    amountKobo: number;
    proofUrl: string;
    status: string;
  };
  membershipCode: string;
}

export interface PaymentVerifyResult {
  status: string;
  message: string;
  payment: {
    id: string;
    reference: string;
    amountKobo: number;
    status: string;
    proofUrl: string | null;
    paymentType: string;
    createdAt: string;
  };
}

export interface PaymentRecord {
  id: string;
  amount_kobo: number;
  currency: string;
  reference: string;
  status: string;
  payment_type: string;
  proof_of_payment_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RenewMembershipResult {
  paymentId: string;
  reference: string;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode: string;
    referencePrefix: string;
  };
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  filename: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  visibility: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface ResourcePayload {
  title: string;
  description?: string;
  category?: string;
  visibility?: string;
}

// ─── Content types ─────────────────────────────────────────────────────────

export interface NewsItem {
  id: string; title: string; body: string; image_url: string | null;
  status: string; published_at: string | null; created_at: string;
}

export interface EventItem {
  id: string; title: string; description: string | null;
  location: string | null; event_date: string; event_time: string | null;
  badge_label: string | null; badge_class: string | null;
  max_attendees: number | null; status: string; image_url: string | null;
  created_at: string;
}

export interface DuesMember {
  id: string;
  firstName: string;
  lastName: string;
  membershipCode: string;
  membershipCategory: string;
  annualDuePaid: boolean;
  annualDueYear: number | null;
  annualDevelopmentalFeePaid: boolean;
  annualDevelopmentalFeeYear: number | null;
  developmentalLevyAmount: number | null;
}

export interface LeaderItem {
  id: string; name: string; role: string; bio: string | null;
  photo_url: string | null; term_label: string | null;
  sort_order: number; is_active: boolean; created_at: string;
}

export interface FaqItem {
  id: string; question: string; answer: string;
  category: string; sort_order: number; is_active: boolean; created_at: string;
}

// ─── Contact types ─────────────────────────────────────────────────────────

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─── Election types ────────────────────────────────────────────────────────

export interface Election {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "draft" | "upcoming" | "active" | "closed";
  eligible_roles: string[];
  created_by: string | null;
  positions_count: number;
  total_votes: number;
  eligible_voters: number;
  declaration_start: string | null;
  declaration_end: string | null;
  nomination_start: string | null;
  nomination_end: string | null;
  eligible_voters_release_date: string | null;
  screening_date: string | null;
  qualified_candidates_release_date: string | null;
  manifesto_date: string | null;
  election_date: string | null;
  swearing_in_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ElectionPosition {
  id: string;
  election_id: string;
  title: string;
  description: string | null;
  max_candidates: number;
  sort_order: number;
  candidates_count?: number;
  votes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ElectionDetail extends Election {
  positions: ElectionPosition[];
}

export interface ElectionDeclaration {
  id: string;
  election_id: string;
  position_id: string;
  user_id: string;
  statement: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  position_title?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  membership_code?: string;
  membership_category_name?: string;
}

export interface ElectionCandidate {
  id: string;
  position_id: string;
  user_id: string;
  statement: string | null;
  sort_order: number;
  first_name: string;
  last_name: string;
  membership_code: string;
  membership_category_name: string;
  position_title?: string;
}

export interface ElectionResults {
  election: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    eligibleVoters: number;
    totalVoters: number;
    turnout: number;
    turnoutPercentage: number;
  };
  positions: {
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    totalVotes: number;
    candidates: {
      id: string;
      userId: string;
      firstName: string;
      lastName: string;
      membershipCode: string;
      membershipCategory: string;
      statement: string | null;
      sortOrder: number;
      voteCount: number;
      percentage: number;
    }[];
  }[];
}

type ContentType = "news" | "events" | "leadership" | "faq";

export const api = {
  // Auth
  getCategories: () => request<{ categories: Category[] }>("/auth/categories"),

  register: (payload: RegisterPayload) =>
    request<RegisterResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{ user: LoginResult["user"] }>("/auth/me"),

  verifyMember: (membershipCode: string) =>
    request<{ member: { name: string; category: string; membershipCode: string; status: "active" | "expired"; expiresAt: string | null } }>(
      `/auth/verify/${encodeURIComponent(membershipCode)}`
    ),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Dues Directory
  getDuesDirectory: () =>
    request<{ members: DuesMember[] }>("/dues-directory"),

  // Content
  getContent: <T>(type: ContentType, all?: boolean) =>
    request<{ items: T[] }>(`/content/${type}${all ? "?all=true" : ""}`),

  getContentItem: <T>(type: ContentType, id: string) =>
    request<{ item: T }>(`/content/${type}/${encodeURIComponent(id)}`),

  createContent: <T>(type: ContentType, data: Record<string, unknown>) =>
    request<{ item: T }>(`/content/${type}`, {
      method: "POST", body: JSON.stringify(data),
    }),

  updateContent: <T>(type: ContentType, id: string, data: Record<string, unknown>) =>
    request<{ item: T }>(`/content/${type}/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  deleteContent: (type: ContentType, id: string) =>
    request<{ message: string }>(`/content/${type}/${id}`, {
      method: "DELETE",
    }),

  uploadContentFile: (formData: FormData) =>
    request<{ url: string }>("/content/upload", {
      method: "POST",
      headers: {},
      body: formData,
    }),

  // Resources
  getResources: () =>
    request<{ resources: Resource[] }>("/resources"),

  uploadResource: (formData: FormData) =>
    request<{ resource: Resource }>("/resources/upload", {
      method: "POST",
      headers: {}, // Let browser set Content-Type with boundary
      body: formData,
    }),

  updateResource: (id: string, data: Partial<ResourcePayload>) =>
    request<{ resource: Resource }>(`/resources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  replaceResourceFile: (id: string, formData: FormData) =>
    request<{ resource: Resource }>(`/resources/${id}/replace`, {
      method: "PUT",
      headers: {},
      body: formData,
    }),

  deleteResource: (id: string) =>
    request<{ message: string }>(`/resources/${id}`, {
      method: "DELETE",
    }),

  // Payments — Bank Transfer
  initializePayment: (userId: string, amountKobo: number, email: string, paymentType = "registration") =>
    request<PaymentInitResult>("/payments/initialize", {
      method: "POST",
      body: JSON.stringify({ userId, amountKobo, email, paymentType }),
    }),

  uploadPaymentProof: (userId: string, paymentId: string, proofFile: File) => {
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("paymentId", paymentId);
    formData.append("proof", proofFile);
    return request<PaymentProofResult>("/payments/upload-proof", {
      method: "POST",
      headers: {},
      body: formData,
    });
  },

  verifyPayment: (reference: string) =>
    request<PaymentVerifyResult>(`/payments/verify?reference=${encodeURIComponent(reference)}`),

  // ─── Payment History ──────────────────────────────────────────────────────
  getPaymentHistory: () =>
    request<{ payments: PaymentRecord[] }>("/payments/history"),

  // ─── Membership Renewal ───────────────────────────────────────────────────
  renewMembership: (amountKobo: number, email: string) =>
    request<RenewMembershipResult>("/payments/renew", {
      method: "POST",
      body: JSON.stringify({ amountKobo, email }),
    }),

  // ─── Admin Payments ───────────────────────────────────────────────────────
  getAdminPayments: (page = 1, limit = 20) =>
    request<{ payments: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/payments/admin/all?page=${page}&limit=${limit}`
    ),

  getAdminPaymentStats: () =>
    request<{ stats: { totalCollected: number; renewalsDue: number; pendingTotal: number; pendingCount: number; awaitingCount: number; totalConfirmed: number; lifetimeCollected: number; upcomingRenewals: number; collectionRate: number; totalRegistrations: number; totalRenewals: number; totalPaymentsThisYear: number } }>("/payments/admin/stats"),

  getAdminUpcomingPayments: () =>
    request<{ members: any[] }>("/payments/admin/upcoming"),

  confirmPayment: (id: string) =>
    request<{ message: string }>(`/payments/admin/${id}/confirm`, {
      method: "PUT",
    }),

  rejectPayment: (id: string) =>
    request<{ message: string }>(`/payments/admin/${id}/reject`, {
      method: "PUT",
    }),

  getRenewalsDue: () =>
    request<{ members: any[] }>("/payments/admin/renewals-due"),

  // ─── Contact ───────────────────────────────────────────────────────────────
  submitContact: (data: { name: string; email: string; subject: string; message: string }) =>
    request<{ message: string }>("/contact", {
      method: "POST", body: JSON.stringify(data),
    }),

  getContactMessages: () =>
    request<{ messages: ContactMessage[] }>("/admin/contact"),

  markContactRead: (id: string) =>
    request<{ message: string }>(`/admin/contact/${id}/read`, {
      method: "PUT",
    }),

  // ─── Elections ────────────────────────────────────────────────────────────
  getElections: () =>
    request<{ elections: Election[] }>("/elections"),

  getElection: (id: string) =>
    request<{ election: ElectionDetail }>(`/elections/${id}`),

  createElection: (data: Record<string, unknown>) =>
    request<{ election: Election }>("/elections", {
      method: "POST", body: JSON.stringify(data),
    }),

  updateElection: (id: string, data: Record<string, unknown>) =>
    request<{ election: Election }>(`/elections/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  updateElectionStatus: (id: string, status: string) =>
    request<{ election: Election }>(`/elections/${id}/status`, {
      method: "PUT", body: JSON.stringify({ status }),
    }),

  deleteElection: (id: string) =>
    request<{ message: string }>(`/elections/${id}`, {
      method: "DELETE",
    }),

  // Positions
  createPosition: (electionId: string, data: Record<string, unknown>) =>
    request<{ position: ElectionPosition }>(`/elections/${electionId}/positions`, {
      method: "POST", body: JSON.stringify(data),
    }),

  updatePosition: (id: string, data: Record<string, unknown>) =>
    request<{ position: ElectionPosition }>(`/elections/positions/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  deletePosition: (id: string) =>
    request<{ message: string }>(`/elections/positions/${id}`, {
      method: "DELETE",
    }),

  // Declarations
  declareInterest: (electionId: string, positionId: string, statement?: string) =>
    request<{ declaration: ElectionDeclaration }>(`/elections/${electionId}/declare`, {
      method: "POST", body: JSON.stringify({ positionId, statement }),
    }),

  getMyDeclarations: (electionId: string) =>
    request<{ declarations: ElectionDeclaration[] }>(`/elections/${electionId}/my-declarations`),

  getDeclarations: (electionId: string) =>
    request<{ declarations: ElectionDeclaration[] }>(`/elections/${electionId}/declarations`),

  approveDeclaration: (id: string) =>
    request<{ message: string }>(`/elections/declarations/${id}`, {
      method: "PUT", body: JSON.stringify({ status: "approved" }),
    }),

  rejectDeclaration: (id: string) =>
    request<{ message: string }>(`/elections/declarations/${id}`, {
      method: "PUT", body: JSON.stringify({ status: "rejected" }),
    }),

  deleteDeclaration: (id: string) =>
    request<{ message: string }>(`/elections/declarations/${id}`, {
      method: "DELETE",
    }),

  adminDeclareInterest: (electionId: string, positionId: string, userId: string, statement?: string) =>
    request<{ declaration: ElectionDeclaration; message: string }>(`/elections/${electionId}/declare-as-admin`, {
      method: "POST", body: JSON.stringify({ positionId, userId, statement }),
    }),

  getElectionEvents: () =>
    request<{ events: any[] }>("/elections/events"),

  // Candidates & Voting
  getCandidates: (electionId: string) =>
    request<{ candidates: ElectionCandidate[] }>(`/elections/${electionId}/candidates`),

  castVote: (electionId: string, votes: { positionId: string; candidateId: string }[]) =>
    request<{ message: string }>(`/elections/${electionId}/vote`, {
      method: "POST", body: JSON.stringify({ votes }),
    }),

  hasVoted: (electionId: string) =>
    request<{ votedPositions: string[] }>(`/elections/${electionId}/has-voted`),

  // Results
  getResults: (electionId: string) =>
    request<ElectionResults>(`/elections/${electionId}/results`),

  // Eligible voters (admin)
  getEligibleVoters: (electionId: string) =>
    request<{ voters: any[] }>(`/elections/${electionId}/eligible-voters`),

  // ─── Admin - Members ───────────────────────────────────────────────────────
  getMembers: () =>
    request<{ members: any[] }>("/admin/members"),

  getMember: (id: string) =>
    request<{ member: any }>(`/admin/members/${id}`),

  updateMember: (id: string, data: Record<string, unknown>) =>
    request<{ message: string; member: any }>(`/admin/members/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  approveMember: (id: string, data: { membershipCode?: string; notes?: string }) =>
    request<{ message: string; member: any }>(`/admin/members/${id}/approve`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  rejectMember: (id: string, reason: string) =>
    request<{ message: string; member: any }>(`/admin/members/${id}/reject`, {
      method: "PUT", body: JSON.stringify({ reason }),
    }),

  suspendMember: (id: string) =>
    request<{ message: string }>(`/admin/members/${id}/suspend`, {
      method: "PUT",
    }),

  reinstateMember: (id: string) =>
    request<{ message: string }>(`/admin/members/${id}/reinstate`, {
      method: "PUT",
    }),

  remindMember: (id: string) =>
    request<{ message: string }>(`/admin/members/${id}/remind`, {
      method: "POST",
    }),

  confirmDues: (id: string, data: { markAnnualDue?: boolean; markDevelopmentalFee?: boolean; developmentalAmount?: number }) =>
    request<{ message: string; memberId: string }>(`/admin/members/${id}/dues`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  createMember: (data: Record<string, unknown>) =>
    request<{ message: string; member: any }>("/admin/members", {
      method: "POST", body: JSON.stringify(data),
    }),

  getMemberPayments: (id: string) =>
    request<{ payments: any[] }>(`/admin/members/${id}/payments`),

  deleteMember: (id: string) =>
    request<{ message: string }>(`/admin/members/${id}`, {
      method: "DELETE",
    }),

  adminSendResetPassword: (id: string) =>
    request<{ message: string }>(`/admin/members/${id}/send-reset-password`, {
      method: "POST",
    }),

  adminForceResetPassword: (id: string, newPassword: string) =>
    request<{ message: string }>(`/admin/members/${id}/force-reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),

  // ─── Admin - Reports ───────────────────────────────────────────────────────
  getReports: () =>
    request<{
      stats: {
        totalRegistered: number;
        yoyGrowth: number;
        renewalRate: number;
        voterTurnout: number;
      };
      membershipByCategory: { label: string; val: string; pct: number }[];
      registrationTrends: { month: string; val: number; h: number; o: number }[];
      paymentSummary: { label: string; val: string; pct: number }[];
      votingParticipation: { label: string; val: string; pct: number }[];
    }>("/admin/reports"),

  // ─── Admin - Settings ──────────────────────────────────────────────────────
  getAdminCategories: () =>
    request<{ categories: any[] }>("/admin/settings/categories"),

  getEmailTemplates: () =>
    request<{ templates: any[] }>("/admin/settings/email-templates"),

  createEmailTemplate: (data: { name: string; subject: string; body: string; variables?: string[] }) =>
    request<{ template: any }>("/admin/settings/email-templates", {
      method: "POST", body: JSON.stringify(data),
    }),

  updateEmailTemplate: (id: string, data: Record<string, unknown>) =>
    request<{ template: any }>(`/admin/settings/email-templates/${id}`, {
      method: "PUT", body: JSON.stringify(data),
    }),

  deleteEmailTemplate: (id: string) =>
    request<{ message: string }>(`/admin/settings/email-templates/${id}`, {
      method: "DELETE",
    }),

  getAdmins: () =>
    request<{ admins: any[] }>("/admin/settings/admins"),

  addAdmin: (email: string) =>
    request<{ message: string; admin: any }>("/admin/settings/admins", {
      method: "POST", body: JSON.stringify({ email }),
    }),

  removeAdmin: (id: string) =>
    request<{ message: string }>(`/admin/settings/admins/${id}`, {
      method: "DELETE",
    }),

  // ─── Admin - Dashboard ─────────────────────────────────────────────────────
  getDashboard: () =>
    request<{
      stats: {
        totalMembers: number;
        activeMembers: number;
        expiringSoon: number;
        pendingApplications: number;
        pendingApprovalCount: number;
      };
      activity: { type: string; text: string; time: string }[];
    }>("/admin/dashboard"),

  // ─── Admin - Profile ───────────────────────────────────────────────────────
  getProfile: () =>
    request<{ profile: any }>("/admin/profile"),

  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; phone?: string }) =>
    request<{ message: string; profile: any }>("/admin/profile", {
      method: "PUT", body: JSON.stringify(data),
    }),

  adminChangePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/admin/profile/password", {
      method: "PUT", body: JSON.stringify({ currentPassword, newPassword }),
    }),
};
