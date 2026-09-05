/**
 * ScreenWise CV screening engine - free, offline, deterministic.
 *
 *   file bytes ──▶ extract text ──▶ five scored dimensions ──▶ weighted total
 *                                        │
 *                                        └─▶ hard filters ──▶ manual-review flag
 *
 * No LLM, no external API. Every score is arithmetic over the CV text and the
 * job's own `weights` / `hardFilters`, so the same CV against the same job
 * always yields the same number. See docs/screening-engine.md.
 */
import { normalize, clamp } from "./text.js";
import { extractText } from "./extract.js";
import { extractContact } from "./contact.js";
import {
  scoreSkills,
  estimateYears,
  scoreExperience,
  detectEducation,
  scoreEducation,
  scoreCertifications,
  scoreKeywords,
  guessTitles,
  hasWorkEligibilitySignal,
} from "./dimensions.js";

/** Pull just the fields the engine reads off a Job (mongoose doc or plain). */
function readCriteria(job) {
  const w = job.weights || {};
  return {
    title: job.title || "",
    description: job.description || "",
    requiredSkills: job.requiredSkills || [],
    niceToHaveSkills: job.niceToHaveSkills || [],
    minYears: job.minYears || 0,
    educationLevel: job.educationLevel || "Any",
    certifications: job.certifications || [],
    hardFilters: {
      workPermitRequired: job.hardFilters?.workPermitRequired || false,
      minYears: job.hardFilters?.minYears ?? job.minYears ?? 0,
      mustHaveSkills: job.hardFilters?.mustHaveSkills || [],
    },
    weights: {
      skills: w.skills ?? 40,
      experience: w.experience ?? 25,
      education: w.education ?? 15,
      certifications: w.certifications ?? 10,
      keywords: w.keywords ?? 10,
    },
  };
}

/** File couldn't be read (corrupt, or a scanned/image-only CV). Scores 0 with a
 *  plain reason - it still lands on the board, just at the bottom. */
function unreadable(criteria, reason) {
  return {
    score: 0,
    scoreBreakdown: [{ dimension: "File", weight: 0, scored: 0, note: reason }],
    matchedSkills: [],
    missingSkills: criteria.requiredSkills,
    yearsExperience: 0,
    currentTitle: "",
    pastTitles: [],
    educationLevel: "-",
    needsManualReview: false,
    reasons: [reason],
    status: "screened",
    contact: { email: "", phone: "", name: "" },
  };
}

function noteFor(dimension, ctx) {
  const { skills, years, criteria, education, certs, keywords } = ctx;
  switch (dimension) {
    case "Skills match":
      return `Matched ${skills.matched.length} of ${criteria.requiredSkills.length} required skills` +
        (skills.matched.length ? `: ${skills.matched.join(", ")}` : "") +
        (skills.niceMatched.length ? ` · nice-to-have: ${skills.niceMatched.join(", ")}` : "");
    case "Experience":
      return criteria.minYears > 0
        ? `~${years} yr${years === 1 ? "" : "s"} found vs ${criteria.minYears} required`
        : `~${years} yr${years === 1 ? "" : "s"} of experience found (no minimum set)`;
    case "Education":
      return `Detected: ${education.label}. Requirement: ${criteria.educationLevel || "Any"}.`;
    case "Certifications":
      return criteria.certifications.length
        ? `Matched ${certs.matched.length} of ${criteria.certifications.length}: ${criteria.certifications.join(", ")}`
        : "No certifications required for this role.";
    case "Keyword match":
      return `CV/description term overlap ${(keywords.raw * 100).toFixed(0)}% (raw cosine).`;
    default:
      return "";
  }
}

function hardFilterFailures(criteria, { years, matchedSkills, cvNorm }) {
  const f = criteria.hardFilters;
  const out = [];

  if (f.minYears > 0 && years < f.minYears) {
    out.push(`Below the ${f.minYears}-year minimum (found ~${years})`);
  }
  const matchedLower = matchedSkills.map((s) => s.toLowerCase());
  for (const skill of f.mustHaveSkills) {
    if (!matchedLower.includes(skill.toLowerCase())) out.push(`Missing must-have skill: ${skill}`);
  }
  if (f.workPermitRequired && !hasWorkEligibilitySignal(cvNorm)) {
    out.push("No work-eligibility statement found");
  }
  return out;
}

const HARD_FILTER_PENALTY = 15;

/**
 * Screen one CV against one job.
 *
 * @param {{ buffer: Buffer, fileName: string, mimeType?: string }} file
 * @param {object} job  A Job document (or plain object with the same fields).
 * @returns {Promise<object>} Application-shaped fields: `score`,
 *   `scoreBreakdown`, `matchedSkills`, `missingSkills`, `yearsExperience`,
 *   `currentTitle`, `pastTitles`, `educationLevel`, `needsManualReview`,
 *   `status`, plus a non-persisted `reasons` array.
 */
export async function screenCv(file, job) {
  const criteria = readCriteria(job);

  const extracted = await extractText(file);
  if (!extracted.ok) return unreadable(criteria, extracted.reason);
  if (extracted.text.trim().length < 40) {
    return unreadable(criteria, "Too little readable text - likely a scanned or image-only CV");
  }

  const raw = extracted.text;
  const cv = normalize(raw);

  const skills = scoreSkills(cv, criteria.requiredSkills, criteria.niceToHaveSkills);
  const years = estimateYears(cv, raw);
  const education = detectEducation(cv);
  const certs = scoreCertifications(cv, criteria.certifications);
  const jobText = [
    criteria.title,
    criteria.description,
    ...criteria.requiredSkills,
    ...criteria.niceToHaveSkills,
  ].join(". ");
  const keywords = scoreKeywords(jobText, raw);

  const dims = [
    { dimension: "Skills match", weight: criteria.weights.skills, s01: skills.score01 },
    { dimension: "Experience", weight: criteria.weights.experience, s01: scoreExperience(years, criteria.minYears) },
    { dimension: "Education", weight: criteria.weights.education, s01: scoreEducation(education.level, criteria.educationLevel) },
    { dimension: "Certifications", weight: criteria.weights.certifications, s01: certs.score01 },
    { dimension: "Keyword match", weight: criteria.weights.keywords, s01: keywords.score01 },
  ];

  const ctx = { skills, years, criteria, education, certs, keywords };
  const scoreBreakdown = dims.map((d) => ({
    dimension: d.dimension,
    weight: d.weight,
    scored: Math.round(d.weight * d.s01),
    note: noteFor(d.dimension, ctx),
  }));

  let score = clamp(
    Math.round(scoreBreakdown.reduce((sum, d) => sum + d.scored, 0)),
    0,
    100,
  );

  // Hard filters no longer block a candidate - they apply a fixed penalty and
  // an explanatory note, so the row still ranks (just lower). Nothing is sent
  // to a manual-review queue.
  const reasons = hardFilterFailures(criteria, {
    years,
    matchedSkills: skills.matched,
    cvNorm: cv,
  });
  if (reasons.length) {
    score = Math.max(0, score - HARD_FILTER_PENALTY);
    const skillsRow = scoreBreakdown.find((d) => d.dimension === "Skills match");
    if (skillsRow) {
      skillsRow.note += `  ·  −${HARD_FILTER_PENALTY} pts: ${reasons.join("; ")}`;
    }
  }

  const titles = guessTitles(raw);

  return {
    score,
    scoreBreakdown,
    matchedSkills: skills.matched,
    missingSkills: skills.missing,
    yearsExperience: years,
    currentTitle: titles.currentTitle,
    pastTitles: titles.pastTitles,
    educationLevel: education.label,
    needsManualReview: false,
    reasons,
    status: "screened",
    /** Read off the CV itself - empty when it doesn't state one. Never guessed. */
    contact: extractContact(raw),
  };
}
