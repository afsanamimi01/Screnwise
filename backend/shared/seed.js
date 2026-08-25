import bcrypt from "bcryptjs";
import User from "./models/User.model.js";
import Job from "./models/Job.model.js";
import Application from "./models/Application.model.js";

const DEMO_PASSWORD = "demo1234";

export async function seedIfEmpty() {
  const jobCount = await Job.countDocuments();
  if (jobCount === 0) {
    await seedUsersAndJobs();
  } else {
    console.log("Seed skipped: users/jobs already present");
  }

  const appCount = await Application.countDocuments();
  if (appCount === 0) {
    await seedApplicants();
  } else {
    console.log("Seed skipped: applicants already present");
  }
}

async function seedUsersAndJobs() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = await User.create([
    { name: "Afsana Mimi", email: "admin@screenwise.io", role: "admin", active: true, passwordHash },
    { name: "Nadia Rahman", email: "nadia@screenwise.io", role: "hr", active: true, passwordHash },
    { name: "Tomal", email: "tomal@screenwise.io", role: "hr", active: true, passwordHash },
    { name: "Jordan Blake", email: "jordan@example.com", role: "candidate", active: true, passwordHash },
    { name: "Marc Dubois", email: "marc@screenwise.io", role: "hr", active: false, passwordHash },
  ]);
  const [, hr1, hr2] = users;

  await Job.create([
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
      createdBy: hr1._id,
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
      createdBy: hr1._id,
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
      createdBy: hr2._id,
    },
  ]);

  console.log(`Seeded 5 demo users and 3 demo jobs (password for all: "${DEMO_PASSWORD}")`);
}

/* ----------------- demo applicants (ported from the original Lovable mock data) ---------------- */

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
    "Backend engineer",
    "Senior software engineer",
    "Platform engineer",
    "Full-stack developer",
    "API engineer",
  ],
  "Product designer": [
    "Product designer",
    "UX designer",
    "UI designer",
    "Senior product designer",
    "Design lead",
  ],
  "Data analyst": ["Data analyst", "BI analyst", "Operations analyst", "Reporting specialist"],
};

const educationLevels = ["High school", "Bachelor's degree", "Master's degree", "PhD"];

function seeded(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildBreakdown(job, score, i) {
  const w = job.weights;
  const wobble = (k) => Math.max(0, Math.min(1, score / 100 + (seeded(i * k) - 0.5) * 0.3));
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

async function seedApplicants() {
  const jobs = await Job.find({
    title: { $in: ["Senior backend engineer", "Product designer", "Data analyst"] },
  });
  const byTitle = Object.fromEntries(jobs.map((j) => [j.title, j]));
  const orderedJobs = ["Senior backend engineer", "Product designer", "Data analyst"]
    .map((t) => byTitle[t])
    .filter(Boolean);

  if (!orderedJobs.length) {
    console.log("Seed skipped: no jobs found to attach demo applicants to");
    return;
  }

  const jobCounts = { "Senior backend engineer": 16, "Product designer": 13, "Data analyst": 11 };

  const docs = [];
  let idx = 0;
  let dupSourceIndex = -1;

  for (const job of orderedJobs) {
    const count = jobCounts[job.title];
    const titles = titlesByJobTitle[job.title];

    for (let i = 0; i < count; i++) {
      idx++;
      const fn = firstNames[idx % firstNames.length];
      const ln = lastNames[(idx * 3) % lastNames.length];

      const score = Math.max(18, Math.min(97, scoreCurve[i % scoreCurve.length] - Math.round(seeded(idx) * 6)));
      const matchedCount = Math.max(1, Math.round((score / 100) * job.requiredSkills.length));
      const needsReview = idx === 5 || idx === 22;
      const years = Math.max(0, Math.round((score / 100) * (job.minYears + 3)));

      const doc = {
        jobId: job._id,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        phone: `+49 30 ${1000000 + idx * 137}`,
        alias: `Candidate #${job.title.slice(0, 1)}${String.fromCharCode(65 + (i % 26))}${i + 1}`,
        source: i % 3 === 0 ? "HR-uploaded" : "self-applied",
        score: needsReview ? 0 : score,
        scoreBreakdown: needsReview ? [] : buildBreakdown(job, score, idx),
        matchedSkills: job.requiredSkills.slice(0, matchedCount),
        missingSkills: job.requiredSkills.slice(matchedCount),
        yearsExperience: years,
        currentTitle: titles[i % titles.length],
        pastTitles: [titles[(i + 1) % titles.length], titles[(i + 2) % titles.length]],
        educationLevel: educationLevels[(idx + 1) % educationLevels.length],
        needsManualReview: needsReview,
        status: i < 2 ? "shortlisted" : i < 6 ? "screened" : "applied",
        appliedAt: new Date(`2026-07-${String(2 + (i % 26)).padStart(2, "0")}`),
        cvFileName: `${fn.toLowerCase()}-${ln.toLowerCase()}-cv.pdf`,
      };

      docs.push(doc);
      if (job.title === "Senior backend engineer" && i === 3) dupSourceIndex = docs.length - 1;
    }
  }

  const inserted = await Application.insertMany(docs);
  const dupSourceInserted = dupSourceIndex >= 0 ? inserted[dupSourceIndex] : null;

  if (dupSourceInserted) {
    await Application.create({
      ...dupSourceInserted.toObject(),
      _id: undefined,
      alias: "Candidate #1D99",
      source: "HR-uploaded",
      duplicateOf: dupSourceInserted._id,
      status: "applied",
      appliedAt: new Date("2026-07-21"),
    });
  }

  const jordan = await User.findOne({ email: "jordan@example.com" });
  const job1 = byTitle["Senior backend engineer"];
  const job3 = byTitle["Data analyst"];
  if (jordan && job1 && job3) {
    await Application.create([
      {
        jobId: job1._id,
        candidateId: jordan._id,
        name: "Jordan Blake",
        email: "jordan@example.com",
        phone: "+49 30 5550199",
        alias: "Candidate #1JB",
        source: "self-applied",
        score: 81,
        scoreBreakdown: buildBreakdown(job1, 81, 99),
        matchedSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs"],
        missingSkills: ["Docker", "AWS"],
        yearsExperience: 6,
        currentTitle: "Backend engineer",
        pastTitles: ["Software engineer"],
        educationLevel: "Bachelor's degree",
        needsManualReview: false,
        status: "shortlisted",
        appliedAt: new Date("2026-07-09"),
        cvFileName: "jordan-blake-cv.pdf",
      },
      {
        jobId: job3._id,
        candidateId: jordan._id,
        name: "Jordan Blake",
        email: "jordan@example.com",
        phone: "+49 30 5550199",
        alias: "Candidate #3JB",
        source: "self-applied",
        score: 52,
        scoreBreakdown: buildBreakdown(job3, 52, 98),
        matchedSkills: ["SQL", "Excel"],
        missingSkills: ["Python", "Data visualisation"],
        yearsExperience: 2,
        currentTitle: "Backend engineer",
        pastTitles: [],
        educationLevel: "Bachelor's degree",
        needsManualReview: false,
        status: "screened",
        appliedAt: new Date("2026-07-14"),
        cvFileName: "jordan-blake-cv.pdf",
      },
    ]);
  }

  console.log(`Seeded ${docs.length + 1 + 2} demo applicants across ${orderedJobs.length} jobs`);
}
