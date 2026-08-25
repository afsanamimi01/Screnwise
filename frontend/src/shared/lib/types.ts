export type Role = "hr" | "candidate" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
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
  createdAt: string;
  createdBy: string;
  newSinceLastVisit: number;
};

export type ApplicationStatus = "applied" | "screened" | "shortlisted" | "rejected";

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
