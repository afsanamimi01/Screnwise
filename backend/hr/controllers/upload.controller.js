import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

const TITLES = [
  "Specialist",
  "Associate",
  "Senior specialist",
  "Coordinator",
  "Analyst",
  "Consultant",
];
const EDUCATION_LEVELS = ["High school", "Bachelor's degree", "Master's degree", "PhD"];

function nameFromFileName(fileName, index) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const words = base
    .split(/[-_\s.]+/)
    .filter((w) => w && !/^(cv|resume|final|v\d+)$/i.test(w));
  if (!words.length) return `Uploaded Candidate ${index + 1}`;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function emailFromName(name, index) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return slug ? `${slug}@example.com` : `candidate${index + 1}@example.com`;
}

function buildScoreBreakdown(job, score) {
  const w = job.weights;
  const wobble = () => Math.max(0, Math.min(1, score / 100 + (Math.random() - 0.5) * 0.3));
  return [
    {
      dimension: "Skills match",
      weight: w.skills,
      scored: Math.round(w.skills * wobble()),
      note: "Weighted against the job's required skill list.",
    },
    {
      dimension: "Experience",
      weight: w.experience,
      scored: Math.round(w.experience * wobble()),
      note: `Compared against the ${job.minYears}-year requirement.`,
    },
    {
      dimension: "Education",
      weight: w.education,
      scored: Math.round(w.education * wobble()),
      note: `Requirement: ${job.educationLevel}.`,
    },
    {
      dimension: "Certifications",
      weight: w.certifications,
      scored: Math.round(w.certifications * wobble()),
      note: job.certifications.length
        ? `Looking for ${job.certifications.join(", ")}.`
        : "No certifications required for this role.",
    },
    {
      dimension: "Keyword match",
      weight: w.keywords,
      scored: Math.round(w.keywords * wobble()),
      note: "Terms from the job description found in the CV.",
    },
  ];
}

/**
 * There is no real CV-parsing engine behind this demo (that's a separate project
 * on its own) — an uploaded file's score/skill-match is simulated the same way
 * the original prototype's seed data was, just generated live per upload instead
 * of baked in ahead of time.
 */
function simulateApplication(job, fileName, index, existingCount) {
  const name = nameFromFileName(fileName, index);
  const needsManualReview = index % 7 === 6;
  const score = needsManualReview ? 0 : 30 + Math.round(Math.random() * 66);
  const matchedCount = Math.max(0, Math.round((score / 100) * job.requiredSkills.length));

  return {
    jobId: job._id,
    name,
    email: emailFromName(name, index),
    phone: `+8801${String(700000000 + existingCount + index).padStart(9, "0")}`,
    alias: `Candidate #${String(existingCount + index + 1).padStart(3, "0")}`,
    source: "HR-uploaded",
    score,
    scoreBreakdown: needsManualReview ? [] : buildScoreBreakdown(job, score),
    matchedSkills: job.requiredSkills.slice(0, matchedCount),
    missingSkills: job.requiredSkills.slice(matchedCount),
    yearsExperience: Math.max(0, Math.round((score / 100) * (job.minYears + 3))),
    currentTitle: TITLES[index % TITLES.length],
    pastTitles: [],
    educationLevel: EDUCATION_LEVELS[index % EDUCATION_LEVELS.length],
    needsManualReview,
    status: "applied",
    appliedAt: new Date(),
    cvFileName: fileName,
  };
}

export async function uploadCvs(req, res, next) {
  try {
    const { jobId } = req.params;
    const { fileNames = [] } = req.body;

    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const existingCount = await Application.countDocuments({ jobId });
    const docs = fileNames.map((fileName, i) => simulateApplication(job, fileName, i, existingCount));
    const created = await Application.insertMany(docs);

    await logAudit(
      req.user.name,
      "CVs uploaded",
      `${fileNames.length} files to ${job.title}`,
      req.user.companyId,
    );
    const blind = created.map((a) => {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      return json;
    });
    res.status(201).json(blind);
  } catch (err) {
    next(err);
  }
}
