/** REST client for the Screenwise backend. */
import { getToken } from "./auth-storage";
import type {
  Application,
  ApplicationStatus,
  AuditEntry,
  BoardSummary,
  Candidate,
  Company,
  Job,
  JobWithStats,
  MailStatus,
  Payment,
  PaymentStatus,
  Plan,
  PlanKey,
  RecruiterDashboard,
  RevenueReport,
  SentEmail,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  /** Machine-readable tag from the server, e.g. `PLAN_REQUIRED`. */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  // Let the browser set the multipart boundary for FormData bodies.
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? `Request failed (${res.status})`, data?.code);
  }
  return data as T;
}

const body = (value: unknown) => JSON.stringify(value);

/* ---------------------------------- auth --------------------------------- */

export function authLogin(email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: body({ email, password }),
  });
}

/** Public self-serve signup - always a candidate. */
export function authRegisterCandidate(name: string, email: string, password: string) {
  return request<{ token: string; user: User }>("/auth/register", {
    method: "POST",
    body: body({ name, email, password }),
  });
}

/** Organisation signup - creates a plan-less company plus its manager account. */
export function authRegisterCompany(payload: {
  companyName: string;
  name: string;
  email: string;
  password: string;
}) {
  return request<{ token: string; user: User; company: Company }>("/auth/register-company", {
    method: "POST",
    body: body(payload),
  });
}

/* --------------------------------- public -------------------------------- */

export function getPlans(): Promise<Plan[]> {
  return request<Plan[]>("/plans");
}

export function getPublicJobs(): Promise<Job[]> {
  return request<Job[]>("/candidate/jobs");
}

export function getPublicJob(jobId: string): Promise<Job> {
  return request<Job>(`/candidate/jobs/${jobId}`);
}

/** Apply to a role. */
export function submitApplication(payload: {
  jobId: string;
  phone?: string;
  cv?: File | null;
}): Promise<{ trackingId: string; score: number }> {
  if (payload.cv) {
    const form = new FormData();
    form.append("cv", payload.cv);
    form.append("jobId", payload.jobId);
    if (payload.phone) form.append("phone", payload.phone);
    return request("/candidate/apply", { method: "POST", body: form });
  }
  return request("/candidate/apply", {
    method: "POST",
    body: body({ jobId: payload.jobId, phone: payload.phone ?? "" }),
  });
}

/* -------------------------------- candidate ------------------------------ */

export function getMyApplications(): Promise<{ app: Application; job: Job | null }[]> {
  return request("/candidate/applications");
}

export type CandidateProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  headline: string;
  location: string;
  phone: string;
  yearsExperience: number;
  educationLevel: string;
  skills: string[];
  summary: string;
  links: { portfolio: string; linkedin: string; github: string };
  cv: { fileName: string; size: number; contentType: string; uploadedAt: string } | null;
};

export type CandidateProfilePatch = Partial<
  Pick<
    CandidateProfile,
     "name" |"headline" | "location" | "phone" | "yearsExperience" | "educationLevel" | "skills" | "summary"
  > & { links: Partial<CandidateProfile["links"]> }
>;

export function getCandidateProfile(): Promise<CandidateProfile> {
  return request<CandidateProfile>("/candidate/profile");
}

export function updateCandidateProfile(patch: CandidateProfilePatch): Promise<CandidateProfile> {
  return request<CandidateProfile>("/candidate/profile", { method: "PUT", body: body(patch) });
}

export function uploadProfileCv(file: File): Promise<CandidateProfile> {
  const form = new FormData();
  form.append("cv", file);
  return request<CandidateProfile>("/candidate/profile/cv", { method: "POST", body: form });
}

export function deleteProfileCv(): Promise<CandidateProfile> {
  return request<CandidateProfile>("/candidate/profile/cv", { method: "DELETE" });
}

/** Fetch the stored CV as a blob (needs the auth header, so not a plain link). */
export async function getProfileCvBlob(): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/candidate/profile/cv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, "Could not load your CV");
  return res.blob();
}

/* ----------------------------------- hr --------------------------------- */

export function getDashboard(): Promise<RecruiterDashboard> {
  return request("/hr/dashboard");
}

export function getJobs(): Promise<Job[]> {
  return request<Job[]>("/hr/jobs");
}

/** The independent CV-screening batches (kind: "screening"). */
export function getScreenings(): Promise<Job[]> {
  return request<Job[]>("/hr/jobs?kind=screening");
}

export function getJob(jobId: string): Promise<Job> {
  return request<Job>(`/hr/jobs/${jobId}`);
}

export function createJob(job: Job): Promise<Job> {
  return request<Job>("/hr/jobs", { method: "POST", body: body({ ...job, kind: "job" }) });
}

export function createScreening(job: Job): Promise<Job> {
  return request<Job>("/hr/jobs", { method: "POST", body: body({ ...job, kind: "screening" }) });
}

export function updateJob(job: Job): Promise<Job> {
  return request<Job>(`/hr/jobs/${job.id}`, { method: "PUT", body: body(job) });
}

/** Blind rank board - identity fields are stripped and tile counts summed by the server. */
export function getApplicationsForJob(
  jobId: string,
): Promise<{ summary: BoardSummary; applications: Application[] }> {
  return request<{ summary: BoardSummary; applications: Application[] }>(`/hr/board/${jobId}`);
}

/** Shortlisted-and-beyond candidates with identities revealed. */
export function getShortlist(
  jobId: string,
): Promise<{ app: Application; candidate: Candidate }[]> {
  return request(`/hr/shortlist/${jobId}`);
}

export function shortlistCandidate(applicationIds: string[]): Promise<{ shortlisted: number }> {
  return request("/hr/shortlist", { method: "POST", body: body({ applicationIds }) });
}

/** Undo a shortlist - HR-only, same as shortlisting itself. */
export function unshortlistCandidate(
  applicationIds: string[],
): Promise<{ unshortlisted: number }> {
  return request("/hr/shortlist/unshortlist", {
    method: "POST",
    body: body({ applicationIds }),
  });
}

/** Full CV of a shortlisted, self-applied candidate. */
export async function fetchApplicationCv(applicationId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/hr/shortlist/cv/${applicationId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    // The error body is JSON even though a success is binary.
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message ?? "Could not open the CV", data?.code);
  }

  return URL.createObjectURL(await res.blob());
}

/** Upload CV files for one job/screening. */
export function uploadCvs(jobId: string, files: File[]): Promise<Application[]> {
  const form = new FormData();
  for (const file of files) form.append("cvs", file);
  return request<Application[]>(`/hr/upload/${jobId}`, { method: "POST", body: form });
}

/** Sends one personalised message per shortlisted candidate. */
export function sendShortlistEmails(payload: {
  jobId: string;
  subject: string;
  body: string;
  template: string;
  applicationIds: string[];
}): Promise<SentEmail> {
  const { jobId, ...rest } = payload;
  return request<SentEmail>(`/hr/email/${jobId}`, { method: "POST", body: body(rest) });
}

export function getSentEmails(jobId: string): Promise<SentEmail[]> {
  return request<SentEmail[]>(`/hr/email/${jobId}`);
}

/** Which email provider the server is configured with, if any. */
export function getMailStatus(): Promise<MailStatus> {
  return request<MailStatus>("/hr/email/status");
}

/* --------------------------- manager console ----------------------------- */

export type CompanyOverview = Company & {
  hrSeatsUsed: number;
  hrCount: number;
  /** CVs screened so far this calendar month (HR uploads + self-applies). */
  cvScreeningUsed: number;
  /** null = unlimited. */
  cvScreeningRemaining: number | null;
  /** Full plan card for the current plan; `plan` (inherited) stays the key. */
  planDetail: Plan | null;
};

export function getMyCompany(): Promise<CompanyOverview> {
  return request<CompanyOverview>("/manager");
}

export function getCompanyHr(): Promise<User[]> {
  return request<User[]>("/manager/hr");
}

export function createHr(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  return request<User>("/manager/hr", { method: "POST", body: body(payload) });
}

export function updateHr(id: string, patch: { active?: boolean; name?: string }): Promise<User> {
  return request<User>(`/manager/hr/${id}`, { method: "PATCH", body: body(patch) });
}

export function changePlan(plan: PlanKey): Promise<Company> {
  return request<Company>("/manager/plan", { method: "PATCH", body: body({ plan }) });
}

/** Whether a payment gateway is configured, and whether it is live or sandbox. */
export function getPaymentStatus(): Promise<PaymentStatus> {
  return request<PaymentStatus>("/manager/payments/status");
}

/** This company's checkout history. */
export function getPayments(): Promise<Payment[]> {
  return request<Payment[]>("/manager/payments");
}

/** Start a plan purchase. */
export function startPayment(
  plan: PlanKey,
): Promise<{ paid: boolean; redirectUrl: string | null; tranId?: string }> {
  return request("/manager/payments", { method: "POST", body: body({ plan }) });
}

/** Manager's own read-only view of jobs, board, shortlist. */
export function getManagerDashboard(): Promise<RecruiterDashboard> {
  return request("/manager/dashboard");
}

export function getManagerJobs(): Promise<JobWithStats[]> {
  return request<JobWithStats[]>("/manager/jobs");
}

export function getManagerScreenings(): Promise<JobWithStats[]> {
  return request<JobWithStats[]>("/manager/jobs?kind=screening");
}

export function getManagerJob(jobId: string): Promise<Job> {
  return request<Job>(`/manager/jobs/${jobId}`);
}

export function getManagerApplicationsForJob(jobId: string): Promise<Application[]> {
  return request<Application[]>(`/manager/board/${jobId}`);
}

export function getManagerShortlist(
  jobId: string,
): Promise<{ app: Application; candidate: Candidate }[]> {
  return request(`/manager/shortlist/${jobId}`);
}

export async function fetchManagerApplicationCv(applicationId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}/manager/shortlist/cv/${applicationId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.message ?? "Could not open the CV", data?.code);
  }

  return URL.createObjectURL(await res.blob());
}

/* ----------------------- admin (super-admin console) ------------------- */

/** Platform revenue: totals, monthly trend, and every payment attempt. */
export function getRevenue(): Promise<RevenueReport> {
  return request<RevenueReport>("/admin/revenue");
}

export type AdminDashboard = {
  totals: {
    companies: number;
    activeCompanies: number;
    candidates: number;
    jobs: number;
    applications: number;
  };
  planMix: Record<string, number>;
  expiringSoon: {
    id: string;
    name: string;
    plan: PlanKey | null;
    status: string;
    subscriptionExpiresAt: string | null;
  }[];
  recentCompanies: {
    id: string;
    name: string;
    plan: PlanKey | null;
    status: string;
    accessible: boolean;
    subscriptionExpiresAt: string | null;
  }[];
};

export type CompanyRow = Company & {
  manager: { name: string; email: string } | null;
  hrSeatsUsed: number;
  hrCount: number;
  jobCount: number;
};

export function getAdminDashboard(): Promise<AdminDashboard> {
  return request<AdminDashboard>("/admin/dashboard");
}

export function getCompanies(): Promise<CompanyRow[]> {
  return request<CompanyRow[]>("/admin/companies");
}

/** `clear` resets the subscription without blocking the company. */
export function updateCompanyAccess(
  id: string,
  action: "renew" | "revoke" | "clear",
): Promise<Company> {
  return request<Company>(`/admin/companies/${id}`, {
    method: "PATCH",
    body: body({ action }),
  });
}

export function getUsers(): Promise<User[]> {
  return request<User[]>("/admin/users");
}

export function updateUser(
  user: Pick<User, "id"> & Partial<Pick<User, "active" | "name">>,
): Promise<User> {
  return request<User>(`/admin/users/${user.id}`, {
    method: "PATCH",
    body: body({ active: user.active, name: user.name }),
  });
}

/** `order` flips the list; the newest entries are kept either way. */
export function getAuditLog(order: "asc" | "desc" = "desc"): Promise<AuditEntry[]> {
  return request<AuditEntry[]>(`/admin/audit?order=${order}`);
}

export function getAdminPlans(): Promise<Plan[]> {
  return request<Plan[]>("/admin/plans");
}

export function updatePlan(key: PlanKey, patch: Partial<Plan>): Promise<Plan> {
  return request<Plan>(`/admin/plans/${key}`, { method: "PATCH", body: body(patch) });
}

/* ---------------------------------------------------------------- assistant */

export interface AssistantStatus {
  /** Configured AND with something indexed - the only state that can answer. */
  ready: boolean;
  configured: boolean;
  /** How many knowledge-base documents this user is allowed to reach. */
  documents: number;
  model: string;
  embeddingModel: string;
  /** False means retrieval is keyword-only. */
  semanticSearch: boolean;
  retrievalMode: string;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantAnswer {
  reply: string;
  /** Which lookups produced the answer - shown so a reply can be traced. */
  toolsUsed: string[];
  sources: string[];
  /** The thread this answer was appended to - new on the first question. */
  conversationId: string;
}

/** A stored message. Threads are private to the account that created them. */
export interface AssistantMessage {
  role: "user" | "assistant";
  text: string;
  toolsUsed?: string[];
  failed?: boolean;
  at?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  /** The actor the thread was held as, recorded when it started. */
  role: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  role: string;
  messages: AssistantMessage[];
}

export function getAssistantStatus(): Promise<AssistantStatus> {
  return request<AssistantStatus>("/assistant/status");
}

/** Ask a question, optionally continuing a thread. */
export function askAssistant(
  question: string,
  conversationId?: string | null,
): Promise<AssistantAnswer> {
  return request<AssistantAnswer>("/assistant/ask", {
    method: "POST",
    body: body({ question, conversationId: conversationId ?? undefined }),
  });
}

export function getConversations(): Promise<ConversationSummary[]> {
  return request<ConversationSummary[]>("/assistant/conversations");
}

export function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/assistant/conversations/${id}`);
}

export function deleteConversation(id: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/assistant/conversations/${id}`, { method: "DELETE" });
}

export type { ApplicationStatus };
