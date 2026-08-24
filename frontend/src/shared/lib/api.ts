/**
 * Placeholder data layer.
 * Every function here returns in-memory mock data behind a small artificial
 * delay so loading states are demonstrable. Swap each body for a `fetch()` to
 * your MERN REST API later — the signatures and return shapes stay the same.
 */
import {
  mockApplications,
  mockAudit,
  mockCandidates,
  mockJobs,
  mockUsers,
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

/* ---------------------------------- jobs --------------------------------- */

export async function getJobs(userId?: string, role?: string): Promise<Job[]> {
  const jobs =
    !userId || role === "admin" ? db.jobs : db.jobs.filter((j) => j.createdBy === userId);
  return wait(jobs.map((j) => ({ ...j })));
}

export async function getJob(jobId: string): Promise<Job | undefined> {
  return wait(db.jobs.find((j) => j.id === jobId));
}

export async function getPublicJob(jobId: string): Promise<Job | undefined> {
  return wait(db.jobs.find((j) => j.id === jobId && j.publicApplyEnabled));
}

export async function getPublicJobs(): Promise<Job[]> {
  return wait(db.jobs.filter((j) => j.publicApplyEnabled && j.status === "open"));
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

export async function getApplicationsForCandidate(candidateId: string): Promise<Application[]> {
  return wait(db.applications.filter((a) => a.candidateId === candidateId));
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
  const id = `app-${Date.now()}`;
  const candidateId = `c-${Date.now()}`;
  db.candidates.push({
    id: candidateId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    location: "—",
  });
  const job = db.jobs.find((j) => j.id === payload.jobId);
  db.applications.push({
    id,
    jobId: payload.jobId,
    candidateId,
    alias: `Candidate #NEW${db.applications.length}`,
    source: "self-applied",
    score: 0,
    scoreBreakdown: [],
    matchedSkills: payload.skills.filter((s) => job?.requiredSkills.includes(s)) ?? [],
    missingSkills: job?.requiredSkills.filter((s) => !payload.skills.includes(s)) ?? [],
    yearsExperience: payload.years,
    currentTitle: payload.currentTitle,
    pastTitles: [],
    educationLevel: "—",
    needsManualReview: true,
    status: "applied",
    appliedAt: new Date().toISOString().slice(0, 10),
    cvFileName: payload.cvFileName,
  });
  log(payload.name, "Application submitted", job?.title ?? payload.jobId);
  return wait({ trackingId: id }, 600);
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
