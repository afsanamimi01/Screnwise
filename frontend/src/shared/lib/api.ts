/**
 * REST client for the Screenwise backend (Express + MongoDB).
 *
 * Every call goes to `VITE_API_BASE_URL` (see `.env`) with the signed-in
 * user's JWT attached. Shapes returned here match the `types.ts` models the
 * pages expect.
 */
import { getToken } from "./auth-storage";
import type {
  Application,
  ApplicationStatus,
  AuditEntry,
  Candidate,
  Company,
  Job,
  Plan,
  PlanKey,
  SentEmail,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
    throw new ApiError(res.status, data?.message ?? `Request failed (${res.status})`);
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

export function submitApplication(payload: {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  years: number;
  currentTitle: string;
  cvFileName: string;
}): Promise<{ trackingId: string }> {
  return request("/candidate/apply", { method: "POST", body: body(payload) });
}

/* -------------------------------- candidate ------------------------------ */

export function getMyApplications(): Promise<{ app: Application; job: Job | null }[]> {
  return request("/candidate/applications");
}

/* ----------------------------------- hr --------------------------------- */

export function getDashboard(): Promise<{ jobs: Job[]; apps: Application[] }> {
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

/** Blind rank board - identity fields are stripped by the server. */
export function getApplicationsForJob(jobId: string): Promise<Application[]> {
  return request<Application[]>(`/hr/board/${jobId}`);
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

/**
 * Upload CV files for one job/screening. The server parses and scores each one
 * with the local screening engine and returns the (blind) ranked records.
 */
export function uploadCvs(jobId: string, files: File[]): Promise<Application[]> {
  const form = new FormData();
  for (const file of files) form.append("cvs", file);
  return request<Application[]>(`/hr/upload/${jobId}`, { method: "POST", body: form });
}

export function sendShortlistEmails(payload: {
  jobId: string;
  subject: string;
  body: string;
  template: string;
  recipients: string[];
}): Promise<SentEmail> {
  const { jobId, ...rest } = payload;
  return request<SentEmail>(`/hr/email/${jobId}`, { method: "POST", body: body(rest) });
}

export function getSentEmails(jobId: string): Promise<SentEmail[]> {
  return request<SentEmail[]>(`/hr/email/${jobId}`);
}

/* ------------------------ company (manager console) --------------------- */

export type CompanyOverview = Company & {
  hrSeatsUsed: number;
  hrCount: number;
  /** Full plan card for the current plan; `plan` (inherited) stays the key. */
  planDetail: Plan | null;
};

export function getMyCompany(): Promise<CompanyOverview> {
  return request<CompanyOverview>("/company");
}

export function getCompanyHr(): Promise<User[]> {
  return request<User[]>("/company/hr");
}

export function createHr(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  return request<User>("/company/hr", { method: "POST", body: body(payload) });
}

export function updateHr(id: string, patch: { active?: boolean; name?: string }): Promise<User> {
  return request<User>(`/company/hr/${id}`, { method: "PATCH", body: body(patch) });
}

export function changePlan(plan: PlanKey): Promise<Company> {
  return request<Company>("/company/plan", { method: "PATCH", body: body({ plan }) });
}

/* ----------------------- admin (super-admin console) ------------------- */

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

export function updateCompanyAccess(id: string, action: "renew" | "revoke"): Promise<Company> {
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

export function getAuditLog(): Promise<AuditEntry[]> {
  return request<AuditEntry[]>("/admin/audit");
}

export function getAdminPlans(): Promise<Plan[]> {
  return request<Plan[]>("/admin/plans");
}

export function updatePlan(key: PlanKey, patch: Partial<Plan>): Promise<Plan> {
  return request<Plan>(`/admin/plans/${key}`, { method: "PATCH", body: body(patch) });
}

export type { ApplicationStatus };
