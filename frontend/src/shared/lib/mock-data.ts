import type {
  Application,
  AuditEntry,
  Candidate,
  Job,
  ScoreBreakdownItem,
  User,
} from "./types";
import { DEFAULT_WEIGHTS } from "./types";

export const mockUsers: User[] = [
  {
    id: "u-admin",
    name: "Afsana Mimi",
    email: "admin@screenwise.io",
    role: "admin",
    active: true,
    createdAt: "2026-01-04",
  },
  {
    id: "u-hr-1",
    name: "Nadia Rahman",
    email: "nadia@screenwise.io",
    role: "hr",
    active: true,
    createdAt: "2026-01-12",
  },
  {
    id: "u-hr-2",
    name: "Tomal",
    email: "tomal@screenwise.io",
    role: "hr",
    active: true,
    createdAt: "2026-02-02",
  },
  {
    id: "u-mgr-1",
    name: "Priya Nair",
    email: "priya@screenwise.io",
    role: "manager",
    active: true,
    createdAt: "2026-02-08",
  },
  {
    id: "u-cand-1",
    name: "Jordan Blake",
    email: "jordan@example.com",
    role: "candidate",
    active: true,
    createdAt: "2026-03-01",
  },
  {
    id: "u-hr-3",
    name: "Marc Dubois",
    email: "marc@screenwise.io",
    role: "hr",
    active: false,
    createdAt: "2026-03-14",
  },
];

/**
 * The real backend issues its own user IDs (MongoDB ObjectIds), which don't
 * match the "u-hr-1"-style IDs baked into this mock data's `createdBy` /
 * `managerIds` fields. Resolving by email (stable across any backend/device)
 * lets ownership checks against this mock data keep working regardless of
 * what ID the real auth session actually has.
 */
export function resolveMockUserId(email: string): string | undefined {
  return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())?.id;
}

export const mockJobs: Job[] = [
  {
    id: "job-1",
    title: "Senior backend engineer",
    department: "Engineering",
    location: "Berlin, Germany (hybrid)",
    employmentType: "Full-time",
    description:
      "We are looking for a senior backend engineer to own our payments and identity services. You will design APIs, mentor mid-level engineers, and work closely with product to ship reliable, well-tested systems at scale.",
    requiredSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"],
    niceToHaveSkills: ["Kubernetes", "GraphQL", "Terraform"],
    minYears: 5,
    educationLevel: "Bachelor's degree",
    certifications: ["AWS Solutions Architect"],
    hardFilters: {
      workPermitRequired: true,
      minYears: 3,
      mustHaveSkills: ["Node.js"],
    },
    weights: { skills: 45, experience: 25, education: 10, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    createdAt: "2026-06-02",
    createdBy: "u-hr-1",
    managerIds: ["u-mgr-1"],
    newSinceLastVisit: 4,
  },
  {
    id: "job-2",
    title: "Product designer",
    department: "Design",
    location: "Remote (EU)",
    employmentType: "Full-time",
    description:
      "Join a small design team shaping the end-to-end experience of our hiring products. You will run discovery, prototype quickly, and partner with engineers from first sketch through launch.",
    requiredSkills: ["Figma", "Design systems", "User research", "Prototyping"],
    niceToHaveSkills: ["Motion design", "HTML/CSS"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 2, mustHaveSkills: ["Figma"] },
    weights: DEFAULT_WEIGHTS,
    publicApplyEnabled: true,
    status: "open",
    createdAt: "2026-06-18",
    createdBy: "u-hr-1",
    managerIds: ["u-mgr-1"],
    newSinceLastVisit: 2,
  },
  {
    id: "job-3",
    title: "Data analyst",
    department: "Operations",
    location: "Dhaka, Bangladesh (on-site)",
    employmentType: "Contract",
    description:
      "Support the operations team with reporting, dashboards and ad-hoc analysis. You will work with SQL and Python daily and present findings to non-technical stakeholders.",
    requiredSkills: ["SQL", "Python", "Data visualisation", "Excel"],
    niceToHaveSkills: ["dbt", "Looker"],
    minYears: 2,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 1, mustHaveSkills: ["SQL"] },
    weights: { skills: 35, experience: 20, education: 20, certifications: 5, keywords: 20 },
    publicApplyEnabled: false,
    status: "open",
    createdAt: "2026-07-05",
    createdBy: "u-hr-2",
    managerIds: [],
    newSinceLastVisit: 0,
  },
];

const firstNames = [
  "Amelia","Rahul","Mei","Tobias","Fatima","Diego","Hanna","Yusuf","Clara","Nikhil",
  "Sara","Lukas","Adaeze","Chen","Elena","Omar","Ingrid","Ravi","Zoe","Marek",
  "Aisha","Pedro","Nora","Kenji","Isabel","Samuel","Leila","Anton","Grace","Vikram",
  "Sofie","Hassan","Mira","Jonas","Priyanka","Kwame","Lena","Andre",
];
const lastNames = [
  "Novak","Sharma","Wang","Keller","Haddad","Ramos","Virtanen","Demir","Silva","Menon",
  "Bakker","Weber","Okafor","Liu","Petrova","Farah","Larsen","Iyer","Kovacs","Nowak",
  "Bello","Costa","Lindqvist","Sato","Moreno","Adler","Nassar","Berg","Mwangi","Rao",
  "Andersen","Zahra","Kaur","Fischer","Desai","Mensah","Vogel","Rossi",
];

const titlesByJob: Record<string, string[]> = {
  "job-1": [
    "Backend engineer",
    "Senior software engineer",
    "Platform engineer",
    "Full-stack developer",
    "API engineer",
  ],
  "job-2": [
    "Product designer",
    "UX designer",
    "UI designer",
    "Senior product designer",
    "Design lead",
  ],
  "job-3": ["Data analyst", "BI analyst", "Operations analyst", "Reporting specialist"],
};

const educationLevels = ["High school", "Bachelor's degree", "Master's degree", "PhD"];

function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildBreakdown(job: Job, score: number, i: number): ScoreBreakdownItem[] {
  const w = job.weights;
  const wobble = (k: number) => Math.max(0, Math.min(1, score / 100 + (seeded(i * k) - 0.5) * 0.3));
  return [
    {
      dimension: "Skills match",
      weight: w.skills,
      scored: Math.round(w.skills * wobble(1)),
      note: "Weighted against the job's required skill list.",
    },
    {
      dimension: "Experience",
      weight: w.experience,
      scored: Math.round(w.experience * wobble(2)),
      note: `Compared against the ${job.minYears}-year requirement.`,
    },
    {
      dimension: "Education",
      weight: w.education,
      scored: Math.round(w.education * wobble(3)),
      note: `Requirement: ${job.educationLevel}.`,
    },
    {
      dimension: "Certifications",
      weight: w.certifications,
      scored: Math.round(w.certifications * wobble(4)),
      note: job.certifications.length
        ? `Looking for ${job.certifications.join(", ")}.`
        : "No certifications required for this role.",
    },
    {
      dimension: "Keyword match",
      weight: w.keywords,
      scored: Math.round(w.keywords * wobble(5)),
      note: "Terms from the job description found in the CV.",
    },
  ];
}

const scoreCurve = [
  94, 91, 88, 85, 82, 78, 74, 71, 68, 66, 63, 61, 58, 56, 54, 52, 49, 47, 44, 41, 38, 34, 29, 24,
];

export const mockCandidates: Candidate[] = [];
export const mockApplications: Application[] = [];

let idx = 0;
const jobCounts: Record<string, number> = { "job-1": 16, "job-2": 13, "job-3": 11 };

for (const job of mockJobs) {
  const count = jobCounts[job.id]!;
  for (let i = 0; i < count; i++) {
    idx++;
    const fn = firstNames[idx % firstNames.length]!;
    const ln = lastNames[(idx * 3) % lastNames.length]!;
    const candidateId = `c-${idx}`;
    mockCandidates.push({
      id: candidateId,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+49 30 ${1000000 + idx * 137}`,
      location: job.location.split("(")[0]!.trim(),
    });

    const score = Math.max(
      18,
      Math.min(97, scoreCurve[i % scoreCurve.length]! - Math.round(seeded(idx) * 6)),
    );
    const titles = titlesByJob[job.id]!;
    const matchedCount = Math.max(
      1,
      Math.round((score / 100) * job.requiredSkills.length),
    );
    const needsReview = idx === 5 || idx === 22;
    const years = Math.max(0, Math.round((score / 100) * (job.minYears + 3)));

    mockApplications.push({
      id: `app-${idx}`,
      jobId: job.id,
      candidateId,
      alias: `Candidate #${job.id.slice(-1)}${String.fromCharCode(65 + (i % 26))}${i + 1}`,
      source: i % 3 === 0 ? "HR-uploaded" : "self-applied",
      score: needsReview ? 0 : score,
      scoreBreakdown: needsReview ? [] : buildBreakdown(job, score, idx),
      matchedSkills: job.requiredSkills.slice(0, matchedCount),
      missingSkills: job.requiredSkills.slice(matchedCount),
      yearsExperience: years,
      currentTitle: titles[i % titles.length]!,
      pastTitles: [titles[(i + 1) % titles.length]!, titles[(i + 2) % titles.length]!],
      educationLevel: educationLevels[(idx + 1) % educationLevels.length]!,
      needsManualReview: needsReview,
      status: i < 2 ? "shortlisted" : i < 6 ? "screened" : "applied",
      appliedAt: `2026-07-${String(2 + (i % 26)).padStart(2, "0")}`,
      cvFileName: `${fn.toLowerCase()}-${ln.toLowerCase()}-cv.pdf`,
    });
  }
}

// One obvious duplicate submission on job-1.
const dupSource = mockApplications[3]!;
const dupCandidate = mockCandidates.find((c) => c.id === dupSource.candidateId)!;
mockCandidates.push({ ...dupCandidate, id: "c-dup" });
mockApplications.push({
  ...dupSource,
  id: "app-dup",
  candidateId: "c-dup",
  alias: "Candidate #1D99",
  source: "HR-uploaded",
  duplicateOf: dupSource.id,
  status: "applied",
  appliedAt: "2026-07-21",
});

// Jordan Blake (the demo candidate account) has applications to track.
mockCandidates.push({
  id: "u-cand-1",
  name: "Jordan Blake",
  email: "jordan@example.com",
  phone: "+49 30 5550199",
  location: "Berlin, Germany",
});
mockApplications.push(
  {
    id: "app-jordan-1",
    jobId: "job-1",
    candidateId: "u-cand-1",
    alias: "Candidate #1JB",
    source: "self-applied",
    score: 81,
    scoreBreakdown: buildBreakdown(mockJobs[0]!, 81, 99),
    matchedSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
    missingSkills: ["Docker", "AWS"],
    yearsExperience: 6,
    currentTitle: "Backend engineer",
    pastTitles: ["Software engineer"],
    educationLevel: "Bachelor's degree",
    needsManualReview: false,
    status: "interview",
    appliedAt: "2026-07-09",
    cvFileName: "jordan-blake-cv.pdf",
  },
  {
    id: "app-jordan-2",
    jobId: "job-3",
    candidateId: "u-cand-1",
    alias: "Candidate #3JB",
    source: "self-applied",
    score: 52,
    scoreBreakdown: buildBreakdown(mockJobs[2]!, 52, 98),
    matchedSkills: ["SQL", "Excel"],
    missingSkills: ["Python", "Data visualisation"],
    yearsExperience: 2,
    currentTitle: "Backend engineer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    needsManualReview: false,
    status: "screened",
    appliedAt: "2026-07-14",
    cvFileName: "jordan-blake-cv.pdf",
  },
);

export const mockAudit: AuditEntry[] = [
  {
    id: "a-1",
    actor: "Nadia Rahman",
    action: "Job created",
    detail: "Senior backend engineer",
    timestamp: "2026-06-02 09:14",
  },
  {
    id: "a-2",
    actor: "Nadia Rahman",
    action: "CVs uploaded",
    detail: "12 files to Senior backend engineer",
    timestamp: "2026-06-04 11:02",
  },
  {
    id: "a-3",
    actor: "Nadia Rahman",
    action: "Candidate shortlisted",
    detail: "Candidate #1A1 on Senior backend engineer",
    timestamp: "2026-06-05 15:47",
  },
  {
    id: "a-4",
    actor: "Nadia Rahman",
    action: "Identity revealed",
    detail: "Shortlist opened for Senior backend engineer",
    timestamp: "2026-06-05 15:48",
  },
  {
    id: "a-5",
    actor: "Nadia Rahman",
    action: "Email sent",
    detail: "Invite to interview — 2 recipients",
    timestamp: "2026-06-05 16:10",
  },
  {
    id: "a-6",
    actor: "Tomas Lind",
    action: "Job created",
    detail: "Data analyst",
    timestamp: "2026-07-05 08:30",
  },
  {
    id: "a-7",
    actor: "Sofia Reyes",
    action: "Role changed",
    detail: "Marc Dubois deactivated",
    timestamp: "2026-07-19 13:22",
  },
];
