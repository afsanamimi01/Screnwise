export type Role = "hr" | "manager" | "candidate" | "superadmin";

export type PlanKey = "basic" | "advance" | "custom";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Set for `manager` and `hr`; null for `candidate` and `superadmin`. */
  companyId: string | null;
  /** Filled by the super-admin users endpoint only. */
  companyName?: string | null;
  active: boolean;
  createdAt: string;
};

export type PlanFeature = { label: string; included: boolean };

export type Plan = {
  id: string;
  key: PlanKey;
  name: string;
  tagline: string;
  /** Display string, e.g. "৳5,000". */
  price: string;
  /** What checkout charges. `0` means the plan isn't sold online. */
  amount: number;
  currency: string;
  period: string;
  cta: string;
  featured: boolean;
  /** null = unlimited HR seats. */
  hrSeatLimit: number | null;
  /** null = unlimited CV screenings per calendar month. */
  cvScreeningLimit: number | null;
  features: PlanFeature[];
  order: number;
};

export type Company = {
  id: string;
  name: string;
  /** null until the manager picks a plan on first sign-in. */
  plan: PlanKey | null;
  hrSeatLimit: number | null;
  cvScreeningLimit: number | null;
  status: "active" | "revoked";
  subscriptionStartedAt: string | null;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  expired: boolean;
  accessible: boolean;
};

export type ScoringWeights = {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  keywords: number;
};

export type HardFilters = {
  workPermitRequired: boolean;
  minYears: number;
  mustHaveSkills: string[];
};

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minYears: number;
  educationLevel: string;
  certifications: string[];
  hardFilters: HardFilters;
  weights: ScoringWeights;
  publicApplyEnabled: boolean;
  status: "open" | "closed";
  /** "screening" = an internal CV batch, never on the public board or dashboard. */
  kind: "job" | "screening";
  createdAt: string;
  companyId: string;
  /** Present on the public candidate endpoints. */
  companyName?: string | null;
  createdBy: string | null;
  newSinceLastVisit: number;
};

export type ApplicationStatus =
  | "applied"
  | "screened"
  | "shortlisted"
  | "rejected";

export type ScoreBreakdownItem = {
  dimension: string;
  weight: number;
  scored: number;
  note: string;
};

export type Application = {
  id: string;
  jobId: string;
  candidateId: string;
  alias: string;
  source: "self-applied" | "HR-uploaded";
  score: number;
  scoreBreakdown: ScoreBreakdownItem[];
  matchedSkills: string[];
  missingSkills: string[];
  yearsExperience: number;
  currentTitle: string;
  pastTitles: string[];
  educationLevel: string;
  needsManualReview: boolean;
  duplicateOf?: string;
  status: ApplicationStatus;
  appliedAt: string;
  cvFileName: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  /** True once a shortlisted self-applied candidate has a stored CV to open. */
  cvAvailable?: boolean;
  cvFileName?: string;
};

/** Whether real money can be taken right now. */
export type PaymentStatus = {
  driver: "sslcommerz" | "manual";
  /** True only with live credentials - sandbox and manual are both false. */
  live: boolean;
  configured: boolean;
  sandbox: boolean;
  currency: string;
  message: string;
};

export type Payment = {
  id: string;
  planKey: PlanKey;
  tranId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "invalid";
  gateway: string;
  cardType: string;
  failReason: string;
  createdAt: string;
  paidAt: string | null;
};

/** Everything the super admin's revenue page reads. */
export type RevenueReport = {
  gateway: PaymentStatus;
  currency: string;
  totals: {
    collected: number;
    thisMonth: number;
    last30Days: number;
    paidCount: number;
    attempted: number;
    conversion: number;
    manualCount: number;
    manualAmount: number;
    payingCompanies: number;
    averagePayment: number;
  };
  series: { month: string; amount: number; count: number }[];
  byPlan: { plan: PlanKey; amount: number; count: number }[];
  byStatus: Record<string, number>;
  payments: (Payment & { companyName: string })[];
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
};

/** Which provider handled a send. `console` means it was logged, not delivered. */
export type MailDriver = "resend" | "smtp" | "console";

export type EmailDelivery = {
  email: string;
  name: string;
  applicationId: string | null;
  status: "sent" | "failed";
  messageId: string | null;
  error: string | null;
};

export type SentEmail = {
  id: string;
  jobId: string;
  subject: string;
  body: string;
  recipients: string[];
  /** Per-recipient outcome. Empty on records written before live sending. */
  deliveries: EmailDelivery[];
  sentAt: string;
  template: string;
  driver: MailDriver;
  status: "sent" | "partial" | "failed";
  sentBy: string;
};

/** Whether the server can actually deliver mail right now. */
export type MailStatus = {
  driver: MailDriver;
  /** True only when a provider is configured and reachable. */
  live: boolean;
  configured: boolean;
  /** Live, but delivery is limited (e.g. Resend's shared test sender). */
  restricted: boolean;
  from: string;
  message: string;
};

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 40,
  experience: 25,
  education: 15,
  certifications: 10,
  keywords: 10,
};

export const SCORE_THRESHOLD = 50;

export const STATUS_PIPELINE: ApplicationStatus[] = ["applied", "screened", "shortlisted"];

/**
 * Map a status coming back from the API onto the current pipeline. Records
 * created before the `interview` / `hired` stages were removed still carry
 * those values - collapse them onto `shortlisted`, which is the final stage
 * now, so the tracker renders them as fully progressed instead of unknown.
 */
export function normalizeStatus(status: string): ApplicationStatus {
  if (status === "interview" || status === "hired") return "shortlisted";
  return status as ApplicationStatus;
}
