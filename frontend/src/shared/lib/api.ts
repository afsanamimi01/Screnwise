/**
 * Data layer.
 * Candidate-facing functions (jobs browsing, apply, my applications) call the
 * real MERN REST API. Everything else (admin) is still an
 * in-memory placeholder behind a small artificial delay — swap each body for
 * a `fetch()` the same way once those actors are built.
 */
import { mockApplications, mockAudit, mockCandidates, mockJobs, mockUsers } from "./mock-data";
import type { Application, AuditEntry, Candidate, Job, SentEmail, User } from "./types";

const db = {
  jobs: [...mockJobs],
  applications: [...mockApplications],
  candidates: [...mockCandidates],
  users: [...mockUsers],
  audit: [...mockAudit],
  emails: [] as SentEmail[],
};

const wait = <T,>(value: T, ms = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

function log(actor: string, action: string, detail: string) {
  db.audit.unshift({
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    action,
    detail,
    timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
  });
}

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const TOKEN_KEY = "screenwise.token";

function authHeaders(): HeadersInit {
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request to ${path} failed`);
  }
  return res.json() as Promise<T>;
}

/* ---------------------------------- jobs --------------------------------- */

export async function getJobs(): Promise<Job[]> {
  return apiFetch<Job[]>("/hr/jobs");
}

export async function getDashboard(): Promise<{ jobs: Job[]; apps: Application[] }> {
  return apiFetch<{ jobs: Job[]; apps: Application[] }>("/hr/dashboard");
}

export async function getJob(jobId: string): Promise<Job | undefined> {
  try {
    return await apiFetch<Job>(`/hr/jobs/${jobId}`);
  } catch {
    return undefined;
  }
}

export async function getPublicJob(jobId: string): Promise<Job | undefined> {
  try {
    return await apiFetch<Job>(`/candidate/jobs/${jobId}`);
  } catch {
    return undefined;
  }
}

export async function getPublicJobs(): Promise<Job[]> {
  return apiFetch<Job[]>("/candidate/jobs");
}

export async function createJob(job: Job): Promise<Job> {
  return apiFetch<Job>("/hr/jobs", { method: "POST", body: JSON.stringify(job) });
}

export async function updateJob(job: Job): Promise<Job> {
  return apiFetch<Job>(`/hr/jobs/${job.id}`, { method: "PUT", body: JSON.stringify(job) });
}

/* ------------------------------ applications ----------------------------- */

export async function getApplicationsForJob(jobId: string): Promise<Application[]> {
  return apiFetch<Application[]>(`/hr/board/${jobId}`);
}

export async function getShortlist(
  jobId: string,
): Promise<{ app: Application; candidate: Candidate }[]> {
  return apiFetch<{ app: Application; candidate: Candidate }[]>(`/hr/shortlist/${jobId}`);
}

export async function getApplicationsForCandidate(): Promise<
  { app: Application; job: Job | undefined }[]
> {
  const rows = await apiFetch<(Application & { jobId: Job })[]>("/candidate/applications");
  return rows.map((row) => {
    const job = row.jobId;
    return {
      app: { ...row, jobId: job?.id ?? (row.jobId as unknown as string), appliedAt: row.appliedAt.slice(0, 10) },
      job,
    };
  });
}

export async function shortlistCandidate(applicationIds: string[]): Promise<void> {
  await apiFetch("/hr/shortlist", { method: "POST", body: JSON.stringify({ applicationIds }) });
}

export async function uploadCvs(jobId: string, fileNames: string[]): Promise<Application[]> {
  return apiFetch<Application[]>(`/hr/upload/${jobId}`, {
    method: "POST",
    body: JSON.stringify({ fileNames }),
  });
}

export async function submitApplication(payload: {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  years: number;
  currentTitle: string;
  cvFileName: string;
}): Promise<{ trackingId: string }> {
  return apiFetch<{ trackingId: string }>("/candidate/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* --------------------------------- emails -------------------------------- */

export async function sendShortlistEmails(payload: {
  jobId: string;
  subject: string;
  body: string;
  recipients: string[];
  template: string;
}): Promise<SentEmail> {
  return apiFetch<SentEmail>(`/hr/email/${payload.jobId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSentEmails(jobId: string): Promise<SentEmail[]> {
  return apiFetch<SentEmail[]>(`/hr/email/${jobId}`);
}

/* ---------------------------------- admin -------------------------------- */

export async function getUsers(): Promise<User[]> {
  return wait(db.users);
}

export async function updateUser(user: User, actor: string): Promise<User> {
  db.users = db.users.map((u) => (u.id === user.id ? user : u));
  log(actor, "User updated", `${user.name} — ${user.role}, ${user.active ? "active" : "inactive"}`);
  return wait(user, 200);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  return wait(db.audit);
}

export async function logAudit(actor: string, action: string, detail: string) {
  log(actor, action, detail);
}
