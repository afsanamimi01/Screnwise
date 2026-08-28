import bcrypt from "bcryptjs";
import User from "./models/User.model.js";
import Job from "./models/Job.model.js";
import Application from "./models/Application.model.js";
import SentEmail from "./models/SentEmail.model.js";
import AuditLog from "./models/AuditLog.model.js";

const DEMO_PASSWORD = "demo1234";
const DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ users --- */

const USERS = [
  { key: "admin", name: "Afsana Mimi", email: "admin@screenwise.io", role: "admin", active: true },
  { key: "sofia", name: "Sofia Reyes", email: "sofia@screenwise.io", role: "admin", active: true },
  { key: "nadia", name: "Nadia Rahman", email: "nadia@screenwise.io", role: "hr", active: true },
  { key: "tomal", name: "Tomal Ahmed", email: "tomal@screenwise.io", role: "hr", active: true },
  { key: "marc", name: "Marc Dubois", email: "marc@screenwise.io", role: "hr", active: false },
  { key: "priya", name: "Priya Nair", email: "priya@screenwise.io", role: "manager", active: true },
  { key: "kenji", name: "Kenji Watanabe", email: "kenji@screenwise.io", role: "manager", active: true },
  { key: "jordan", name: "Jordan Blake", email: "jordan@example.com", role: "candidate", active: true },
  { key: "amina", name: "Amina Yusuf", email: "amina@example.com", role: "candidate", active: true },
  { key: "lucas", name: "Lucas Meyer", email: "lucas@example.com", role: "candidate", active: true },
  { key: "chen", name: "Chen Wei", email: "chen@example.com", role: "candidate", active: true },
];

/* ------------------------------------------------------------------- jobs --- */

const JOBS = [
  {
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
    hardFilters: { workPermitRequired: true, minYears: 3, mustHaveSkills: ["Node.js"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    createdByKey: "nadia",
    managerKeys: ["priya"],
    applicantCount: 15,
    newSinceLastVisit: 4,
  },
  {
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
    weights: { skills: 40, experience: 25, education: 15, certifications: 10, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    createdByKey: "nadia",
    managerKeys: ["priya", "kenji"],
    applicantCount: 13,
    newSinceLastVisit: 2,
  },
  {
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
    createdByKey: "tomal",
    managerKeys: ["kenji"],
    applicantCount: 11,
    newSinceLastVisit: 0,
  },
  {
    title: "Frontend engineer (React)",
    department: "Engineering",
    location: "London, UK (hybrid)",
    employmentType: "Full-time",
    description:
      "Build the interfaces recruiters live in all day. You will own a slice of our React app end to end, care about accessibility and performance, and pair closely with design.",
    requiredSkills: ["React", "TypeScript", "CSS", "Testing", "REST APIs"],
    niceToHaveSkills: ["Vite", "Design systems", "GraphQL"],
    minYears: 3,
    educationLevel: "Any",
    certifications: [],
    hardFilters: { workPermitRequired: true, minYears: 2, mustHaveSkills: ["React"] },
    weights: { skills: 45, experience: 20, education: 10, certifications: 5, keywords: 20 },
    publicApplyEnabled: true,
    status: "open",
    createdByKey: "nadia",
    managerKeys: ["priya"],
    applicantCount: 13,
    newSinceLastVisit: 3,
  },
  {
    title: "DevOps engineer",
    department: "Platform",
    location: "Remote (global)",
    employmentType: "Full-time",
    description:
      "Own our delivery pipeline and cloud infrastructure. You will automate everything that can be automated, keep production boring, and help teams ship safely many times a day.",
    requiredSkills: ["AWS", "Terraform", "Kubernetes", "CI/CD", "Linux", "Docker"],
    niceToHaveSkills: ["Prometheus", "Go", "Ansible"],
    minYears: 4,
    educationLevel: "Bachelor's degree",
    certifications: ["AWS Solutions Architect", "CKA"],
    hardFilters: { workPermitRequired: false, minYears: 3, mustHaveSkills: ["AWS", "Terraform"] },
    weights: { skills: 40, experience: 30, education: 5, certifications: 15, keywords: 10 },
    publicApplyEnabled: true,
    status: "open",
    createdByKey: "tomal",
    managerKeys: [],
    applicantCount: 9,
    newSinceLastVisit: 1,
  },
  {
    title: "Marketing manager",
    department: "Marketing",
    location: "Berlin, Germany (on-site)",
    employmentType: "Full-time",
    description:
      "Lead demand generation for a growing B2B product. You will own the funnel from first touch to pipeline, run experiments, and manage a small team plus agency partners.",
    requiredSkills: ["B2B marketing", "SEO", "Content strategy", "Analytics", "Campaign management"],
    niceToHaveSkills: ["HubSpot", "Paid social", "Copywriting"],
    minYears: 5,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: true, minYears: 4, mustHaveSkills: ["B2B marketing"] },
    weights: { skills: 35, experience: 35, education: 10, certifications: 5, keywords: 15 },
    publicApplyEnabled: true,
    status: "closed",
    createdByKey: "tomal",
    managerKeys: ["kenji"],
    applicantCount: 8,
    newSinceLastVisit: 0,
  },
];

/* ------------------------------------------------ applications linked to users --- */

const CANDIDATE_APPS = [
  {
    candidateKey: "jordan",
    jobTitle: "Senior backend engineer",
    score: 81,
    status: "interview",
    matchedSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
    missingSkills: ["Docker", "AWS"],
    yearsExperience: 6,
    currentTitle: "Backend engineer",
    pastTitles: ["Software engineer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 40,
  },
  {
    candidateKey: "jordan",
    jobTitle: "Data analyst",
    score: 52,
    status: "screened",
    matchedSkills: ["SQL", "Excel"],
    missingSkills: ["Python", "Data visualisation"],
    yearsExperience: 2,
    currentTitle: "Backend engineer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 33,
  },
  {
    candidateKey: "jordan",
    jobTitle: "Frontend engineer (React)",
    score: 88,
    status: "hired",
    matchedSkills: ["React", "TypeScript", "CSS", "Testing", "REST APIs"],
    missingSkills: [],
    yearsExperience: 5,
    currentTitle: "Frontend engineer",
    pastTitles: ["Web developer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 28,
  },
  {
    candidateKey: "amina",
    jobTitle: "Product designer",
    score: 76,
    status: "shortlisted",
    matchedSkills: ["Figma", "Design systems", "Prototyping"],
    missingSkills: ["User research"],
    yearsExperience: 4,
    currentTitle: "Product designer",
    pastTitles: ["UI designer"],
    educationLevel: "Master's degree",
    appliedDaysAgo: 18,
  },
  {
    candidateKey: "amina",
    jobTitle: "DevOps engineer",
    score: 61,
    status: "applied",
    matchedSkills: ["AWS", "Docker", "Linux"],
    missingSkills: ["Terraform", "Kubernetes", "CI/CD"],
    yearsExperience: 3,
    currentTitle: "Cloud engineer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 9,
  },
  {
    candidateKey: "lucas",
    jobTitle: "Senior backend engineer",
    score: 33,
    status: "rejected",
    matchedSkills: ["Node.js"],
    missingSkills: ["TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"],
    yearsExperience: 2,
    currentTitle: "Junior developer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 26,
  },
  {
    candidateKey: "lucas",
    jobTitle: "Frontend engineer (React)",
    score: 58,
    status: "screened",
    matchedSkills: ["React", "CSS", "REST APIs"],
    missingSkills: ["TypeScript", "Testing"],
    yearsExperience: 3,
    currentTitle: "Frontend developer",
    pastTitles: ["Junior developer"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 21,
  },
  {
    candidateKey: "lucas",
    jobTitle: "Product designer",
    score: 49,
    status: "applied",
    matchedSkills: ["Figma", "Prototyping"],
    missingSkills: ["Design systems", "User research"],
    yearsExperience: 2,
    currentTitle: "Frontend developer",
    pastTitles: [],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 7,
  },
  {
    candidateKey: "chen",
    jobTitle: "Data analyst",
    score: 79,
    status: "hired",
    matchedSkills: ["SQL", "Python", "Data visualisation", "Excel"],
    missingSkills: [],
    yearsExperience: 4,
    currentTitle: "Data analyst",
    pastTitles: ["BI analyst"],
    educationLevel: "Master's degree",
    appliedDaysAgo: 24,
  },
  {
    candidateKey: "chen",
    jobTitle: "Marketing manager",
    score: 64,
    status: "screened",
    matchedSkills: ["Analytics", "SEO", "Content strategy"],
    missingSkills: ["B2B marketing", "Campaign management"],
    yearsExperience: 5,
    currentTitle: "Analytics lead",
    pastTitles: ["Content strategist"],
    educationLevel: "Bachelor's degree",
    appliedDaysAgo: 15,
  },
];

/* ------------------------------------------------ generated applicant pool --- */

const firstNames = [
  "Amelia", "Rahul", "Mei", "Tobias", "Fatima", "Diego", "Hanna", "Yusuf", "Clara", "Nikhil",
  "Sara", "Lukas", "Adaeze", "Chen", "Elena", "Omar", "Ingrid", "Ravi", "Zoe", "Marek",
  "Aisha", "Pedro", "Nora", "Kenji", "Isabel", "Samuel", "Leila", "Anton", "Grace", "Vikram",
  "Sofie", "Hassan", "Mira", "Jonas", "Priyanka", "Kwame", "Lena", "Andre",
];
const lastNames = [
  "Novak", "Sharma", "Wang", "Keller", "Haddad", "Ramos", "Virtanen", "Demir", "Silva", "Menon",
  "Bakker", "Weber", "Okafor", "Liu", "Petrova", "Farah", "Larsen", "Iyer", "Kovacs", "Nowak",
  "Bello", "Costa", "Lindqvist", "Sato", "Moreno", "Adler", "Nassar", "Berg", "Mwangi", "Rao",
  "Andersen", "Zahra", "Kaur", "Fischer", "Desai", "Mensah", "Vogel", "Rossi",
];

const titlesByJobTitle = {
  "Senior backend engineer": [
    "Backend engineer", "Senior software engineer", "Platform engineer",
    "Full-stack developer", "API engineer",
  ],
  "Product designer": [
    "Product designer", "UX designer", "UI designer", "Senior product designer", "Design lead",
  ],
  "Data analyst": ["Data analyst", "BI analyst", "Operations analyst", "Reporting specialist"],
  "Frontend engineer (React)": [
    "Frontend engineer", "React developer", "UI engineer", "Web developer",
    "Senior frontend engineer",
  ],
  "DevOps engineer": [
    "DevOps engineer", "Site reliability engineer", "Platform engineer",
    "Infrastructure engineer", "Cloud engineer",
  ],
  "Marketing manager": [
    "Marketing manager", "Growth manager", "Brand manager", "Content lead",
    "Digital marketing lead",
  ],
};

const educationLevels = ["High school", "Bachelor's degree", "Master's degree", "PhD"];

const scoreCurve = [
  94, 91, 88, 85, 82, 78, 74, 71, 68, 66, 63, 61, 58, 56, 54, 52, 49, 47, 44, 41, 38, 34, 29, 24,
];

const PIPELINE_JOBS = new Set([
  "Senior backend engineer",
  "Product designer",
  "Frontend engineer (React)",
]);

function seeded(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildBreakdown(job, score, salt) {
  const w = job.weights;
  const wobble = (k) => Math.max(0, Math.min(1, score / 100 + (seeded(salt * k) - 0.5) * 0.3));
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

function generatedStatus(jobTitle, i) {
  if (PIPELINE_JOBS.has(jobTitle)) {
    if (i === 0) return jobTitle === "Frontend engineer (React)" ? "hired" : "shortlisted";
    if (i === 1 || i === 2) return "shortlisted";
    if (i === 3) return "interview";
    if (i < 7) return "screened";
    if (i % 9 === 8) return "rejected";
    return "applied";
  }
  if (i < 2) return "shortlisted";
  if (i < 6) return "screened";
  if (i % 9 === 8) return "rejected";
  return "applied";
}

function buildGeneratedApplicants(jobDoc) {
  const defn = JOBS.find((j) => j.title === jobDoc.title);
  const count = defn.applicantCount;
  const titles = titlesByJobTitle[jobDoc.title] ?? ["Specialist", "Analyst", "Associate"];
  const docs = [];

  for (let i = 0; i < count; i++) {
    const salt = jobDoc.title.length * 100 + i + 1;
    const fn = firstNames[(salt * 2) % firstNames.length];
    const ln = lastNames[(salt * 3) % lastNames.length];

    const needsManualReview = i === 4 || (jobDoc.title === "DevOps engineer" && i === 6);
    const rawScore = scoreCurve[i % scoreCurve.length] - Math.round(seeded(salt) * 6);
    const score = needsManualReview ? 0 : Math.max(18, Math.min(97, rawScore));
    const matchedCount = Math.max(1, Math.round((score / 100) * jobDoc.requiredSkills.length));
    const years = Math.max(0, Math.round((score / 100) * (jobDoc.minYears + 3)));

    docs.push({
      jobId: jobDoc._id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${salt}@example.com`,
      phone: `+49 30 ${1000000 + salt * 137}`,
      alias: `Candidate #${jobDoc.title.slice(0, 1)}${String.fromCharCode(65 + (i % 26))}${i + 1}`,
      source: i % 3 === 0 ? "HR-uploaded" : "self-applied",
      score,
      scoreBreakdown: needsManualReview ? [] : buildBreakdown(jobDoc, score, salt),
      matchedSkills: jobDoc.requiredSkills.slice(0, matchedCount),
      missingSkills: jobDoc.requiredSkills.slice(matchedCount),
      yearsExperience: years,
      currentTitle: titles[i % titles.length],
      pastTitles: [titles[(i + 1) % titles.length], titles[(i + 2) % titles.length]],
      educationLevel: educationLevels[(salt + 1) % educationLevels.length],
      needsManualReview,
      status: generatedStatus(jobDoc.title, i),
      appliedAt: new Date(Date.now() - (60 - (i % 40)) * DAY),
      cvFileName: `${fn.toLowerCase()}-${ln.toLowerCase()}-cv.pdf`,
    });
  }
  return docs;
}

/* -------------------------------------------------------------- audit log --- */

const AUDIT_SEED = [
  { actor: "Nadia Rahman", action: "Job created", detail: "Senior backend engineer", daysAgo: 44 },
  { actor: "Nadia Rahman", action: "CVs uploaded", detail: "12 files to Senior backend engineer", daysAgo: 42 },
  { actor: "Nadia Rahman", action: "Candidate shortlisted", detail: "3 candidate(s) on Senior backend engineer", daysAgo: 39 },
  { actor: "Nadia Rahman", action: "Identity revealed", detail: "Shortlist opened for Senior backend engineer", daysAgo: 39 },
  { actor: "Nadia Rahman", action: "Email sent", detail: "Invite to interview — 3 recipients", daysAgo: 38 },
  { actor: "Tomal Ahmed", action: "Job created", detail: "Data analyst", daysAgo: 34 },
  { actor: "Nadia Rahman", action: "Job created", detail: "Frontend engineer (React)", daysAgo: 30 },
  { actor: "Priya Nair", action: "Feedback left", detail: "Product designer: strong portfolio, move the top 2 forward", daysAgo: 22 },
  { actor: "Afsana Mimi", action: "User updated", detail: "Marc Dubois — hr, inactive", daysAgo: 14 },
  { actor: "Tomal Ahmed", action: "Job updated", detail: "Marketing manager", daysAgo: 8 },
  { actor: "Kenji Watanabe", action: "Feedback left", detail: "Data analyst: shortlist looks good, schedule interviews", daysAgo: 5 },
  { actor: "Nadia Rahman", action: "Candidate shortlisted", detail: "2 candidate(s) on Frontend engineer (React)", daysAgo: 3 },
  { actor: "Nadia Rahman", action: "Email sent", detail: "Invite to interview — 4 recipients", daysAgo: 2 },
];

/* ------------------------------------------------------------ seed runner --- */

const HELPER_KEYS = ["createdByKey", "managerKeys", "applicantCount"];

function stripHelperKeys(job) {
  const out = {};
  for (const [k, v] of Object.entries(job)) {
    if (!HELPER_KEYS.includes(k)) out[k] = v;
  }
  return out;
}

/**
 * @param {{ reset?: boolean }} [opts] When `reset` is true, every collection is
 *   cleared first, so the DB ends up exactly matching this file. When false
 *   (the boot-time default) it only runs against an empty database.
 */
export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      SentEmail.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log("Cleared users, jobs, applications, emails and the audit log");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userDocs = await User.create(
    USERS.map((u) => ({ name: u.name, email: u.email, role: u.role, active: u.active, passwordHash })),
  );
  const userByKey = Object.fromEntries(userDocs.map((doc, i) => [USERS[i].key, doc]));

  const jobDocs = await Job.create(
    JOBS.map((j) => ({
      ...stripHelperKeys(j),
      createdBy: userByKey[j.createdByKey]._id,
      managerIds: j.managerKeys.map((k) => userByKey[k]._id),
    })),
  );
  const jobByTitle = Object.fromEntries(jobDocs.map((doc) => [doc.title, doc]));

  // Anonymous applicant pool (no linked account) for every job.
  const generated = [];
  for (const jobDoc of jobDocs) generated.push(...buildGeneratedApplicants(jobDoc));
  const insertedGenerated = await Application.insertMany(generated);

  // One obvious duplicate submission on the backend role.
  const dupSource = insertedGenerated.find(
    (a) => a.jobId.toString() === jobByTitle["Senior backend engineer"]._id.toString(),
  );
  if (dupSource) {
    const dup = dupSource.toObject();
    delete dup._id;
    await Application.create({
      ...dup,
      alias: "Candidate #Bdup",
      source: "HR-uploaded",
      duplicateOf: dupSource._id,
      status: "applied",
      appliedAt: new Date(Date.now() - 20 * DAY),
    });
  }

  // Applications tied to the demo candidate accounts — a full pipeline each.
  const candidateApps = CANDIDATE_APPS.map((c, i) => {
    const job = jobByTitle[c.jobTitle];
    const user = userByKey[c.candidateKey];
    return {
      jobId: job._id,
      candidateId: user._id,
      name: user.name,
      email: user.email,
      phone: `+49 30 ${5550100 + i}`,
      alias: `Candidate #${c.jobTitle.slice(0, 1)}${user.name.split(" ").map((w) => w[0]).join("")}`,
      source: "self-applied",
      score: c.score,
      scoreBreakdown: buildBreakdown(job, c.score, 900 + i),
      matchedSkills: c.matchedSkills,
      missingSkills: c.missingSkills,
      yearsExperience: c.yearsExperience,
      currentTitle: c.currentTitle,
      pastTitles: c.pastTitles,
      educationLevel: c.educationLevel,
      needsManualReview: false,
      status: c.status,
      appliedAt: new Date(Date.now() - c.appliedDaysAgo * DAY),
      cvFileName: `${user.name.toLowerCase().replace(/\s+/g, "-")}-cv.pdf`,
    };
  });
  await Application.insertMany(candidateApps);

  // A couple of sent emails per job that has people past the blind stage.
  let emailCount = 0;
  for (const title of ["Senior backend engineer", "Product designer", "Frontend engineer (React)"]) {
    const job = jobByTitle[title];
    const advanced = await Application.find({
      jobId: job._id,
      status: { $in: ["shortlisted", "interview", "hired"] },
    });
    const recipients = advanced.map((a) => a.email).filter(Boolean).slice(0, 4);
    if (!recipients.length) continue;
    await SentEmail.create({
      jobId: job._id,
      subject: `Interview invitation — ${title}`,
      body: `Hi,\n\nThank you for applying for ${title}. We'd love to talk further — could you share a few times that work for you next week?\n\nBest,\nThe hiring team`,
      template: "Invite to interview",
      recipients,
      sentAt: new Date(Date.now() - 6 * DAY),
    });
    emailCount++;
  }

  await AuditLog.insertMany(
    AUDIT_SEED.map((a) => ({
      actor: a.actor,
      action: a.action,
      detail: a.detail,
      timestamp: new Date(Date.now() - a.daysAgo * DAY),
    })),
  );

  const appTotal = await Application.countDocuments();
  console.log(
    `Seeded ${userDocs.length} users, ${jobDocs.length} jobs, ${appTotal} applications, ` +
      `${emailCount} sent emails, ${AUDIT_SEED.length} audit entries. ` +
      `Password for every account: "${DEMO_PASSWORD}"`,
  );
}

/** Boot-time guard: only seeds a brand-new (empty) database. */
export async function seedIfEmpty() {
  const jobCount = await Job.countDocuments();
  if (jobCount > 0) {
    console.log("Seed skipped: data already present (run `npm run seed` to rebuild it)");
    return;
  }
  await seedDatabase({ reset: false });
}
