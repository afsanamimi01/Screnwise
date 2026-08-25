/**
 * Data layer.
 * Candidate-facing functions (jobs browsing, apply, my applications) call the
 * real MERN REST API. Everything else (HR/manager/admin) is still an
 * in-memory placeholder behind a small artificial delay — swap each body for
 * a `fetch()` the same way once those actors are built.
 */
import {
  mockApplications,
  mockAudit,
  mockCandidates,
  mockJobs,
  mockUsers,
  resolveMockUserId,
} from "./mock-data";
import type {
  Application,
  ApplicationStatus,
  AuditEntry,
  Candidate,
  Job,
  SentEmail,
  User,
} from "./types";

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

export async function getJobs(userId?: string, role?: string, email?: string): Promise<Job[]> {
  const effectiveId = (email && resolveMockUserId(email)) || userId;
  const jobs =
    !effectiveId || role === "admin"
      ? db.jobs
      : db.jobs.filter((j) => j.createdBy === effectiveId);
  return wait(jobs.map((j) => ({ ...j })));
}

export async function getJob(jobId: string): Promise<Job | undefined> {
  return wait(db.jobs.find((j) => j.id === jobId));
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

export async function createJob(job: Job, actor: string): Promise<Job> {
  db.jobs.unshift(job);
  log(actor, "Job created", job.title);
  return wait(job);
}

export async function updateJob(job: Job, actor: string): Promise<Job> {
  db.jobs = db.jobs.map((j) => (j.id === job.id ? job : j));
  log(actor, "Job updated", job.title);
  return wait(job);
}

/* ------------------------------ applications ----------------------------- */

export async function getApplicationsForJob(jobId: string): Promise<Application[]> {
  return wait(
    db.applications.filter((a) => a.jobId === jobId).sort((a, b) => b.score - a.score),
  );
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

export async function getCandidate(candidateId: string): Promise<Candidate | undefined> {
  return wait(db.candidates.find((c) => c.id === candidateId));
}

export async function getCandidates(): Promise<Candidate[]> {
  return wait(db.candidates);
}

/** Backend-owned in production: parses the CV and produces score + breakdown. */
export async function scoreApplication(applicationId: string): Promise<Application | undefined> {
  return wait(db.applications.find((a) => a.id === applicationId));
}

export async function shortlistCandidate(
  applicationIds: string[],
  actor: string,
): Promise<Application[]> {
  db.applications = db.applications.map((a) =>
    applicationIds.includes(a.id) ? { ...a, status: "shortlisted" as ApplicationStatus } : a,
  );
  log(actor, "Candidate shortlisted", `${applicationIds.length} candidate(s)`);
  return wait(db.applications.filter((a) => applicationIds.includes(a.id)));
}

export async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  actor: string,
): Promise<void> {
  db.applications = db.applications.map((a) => (a.id === applicationId ? { ...a, status } : a));
  log(actor, "Status changed", `${applicationId} → ${status}`);
  return wait(undefined, 150);
}

export async function uploadCvs(
  jobId: string,
  fileNames: string[],
  actor: string,
): Promise<Application[]> {
  const job = db.jobs.find((j) => j.id === jobId);
  log(actor, "CVs uploaded", `${fileNames.length} files to ${job?.title ?? jobId}`);
  return wait([], 200);
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
  actor: string;
}): Promise<SentEmail> {
  const email: SentEmail = {
    id: `mail-${Date.now()}`,
    jobId: payload.jobId,
    subject: payload.subject,
    body: payload.body,
    recipients: payload.recipients,
    template: payload.template,
    sentAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };
  db.emails.unshift(email);
  log(payload.actor, "Email sent", `${payload.template} — ${payload.recipients.length} recipients`);
  return wait(email, 700);
}

export async function getSentEmails(jobId?: string): Promise<SentEmail[]> {
  return wait(jobId ? db.emails.filter((e) => e.jobId === jobId) : db.emails);
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
