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
  price: string;
  period: string;
  cta: string;
  featured: boolean;
  /** null = unlimited HR seats. */
  hrSeatLimit: number | null;
  features: PlanFeature[];
  order: number;
};

export type Company = {
  id: string;
  name: string;
  /** null until the manager picks a plan on first sign-in. */
  plan: PlanKey | null;
  hrSeatLimit: number | null;
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
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  timestamp: string;
};

export type SentEmail = {
  id: string;
  jobId: string;
  subject: string;
  body: string;
  recipients: string[];
  sentAt: string;
  template: string;
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
 * those values — collapse them onto `shortlisted`, which is the final stage
 * now, so the tracker renders them as fully progressed instead of unknown.
 */
export function normalizeStatus(status: string): ApplicationStatus {
  if (status === "interview" || status === "hired") return "shortlisted";
  return status as ApplicationStatus;
}
