/**
 * REST client for the ScanWise backend (Express + MongoDB).
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
  Job,
  Role,
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
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

export function authRegister(name: string, email: string, password: string, role: Role) {
  return request<{ token: string; user: User }>("/auth/register", {
    method: "POST",
    body: body({ name, email, password, role }),
  });
}

/* --------------------------------- public -------------------------------- */

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

export function getJob(jobId: string): Promise<Job> {
  return request<Job>(`/hr/jobs/${jobId}`);
}

export function createJob(job: Job): Promise<Job> {
  return request<Job>("/hr/jobs", { method: "POST", body: body(job) });
}

export function updateJob(job: Job): Promise<Job> {
  return request<Job>(`/hr/jobs/${job.id}`, { method: "PUT", body: body(job) });
}

/** Blind rank board — identity fields are stripped by the server. */
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

export function uploadCvs(jobId: string, fileNames: string[]): Promise<Application[]> {
  return request<Application[]>(`/hr/upload/${jobId}`, {
    method: "POST",
    body: body({ fileNames }),
  });
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

/* -------------------------------- manager ------------------------------- */

export function getManagerShortlists(): Promise<
  { job: Job; entries: { app: Application; candidate: Candidate }[] }[]
> {
  return request("/manager/shortlists");
}

export function sendManagerFeedback(jobId: string, note: string): Promise<{ ok: true }> {
  return request("/manager/feedback", { method: "POST", body: body({ jobId, note }) });
}

/* --------------------------------- admin -------------------------------- */

export function getUsers(): Promise<User[]> {
  return request<User[]>("/admin/users");
}

export function updateUser(
  user: Pick<User, "id"> & Partial<Pick<User, "role" | "active" | "name">>,
): Promise<User> {
  return request<User>(`/admin/users/${user.id}`, {
    method: "PATCH",
    body: body({ role: user.role, active: user.active, name: user.name }),
  });
}

export function getAuditLog(): Promise<AuditEntry[]> {
  return request<AuditEntry[]>("/admin/audit");
}

export type { ApplicationStatus };
