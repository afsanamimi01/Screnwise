/**
 * Score ONE CV against ONE job and print the full breakdown.
 *
 *   node Resumes/sample-mix/score-one.mjs CHEF-02.pdf
 *
 * Edit the JOB below to try any domain / skills / weights / hard filters.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { screenCv } from "../../backend/shared/engine/index.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const cvFile = process.argv[2] || "CHEF-02.pdf";

// ─── edit me ──────────────────────────────────────────────────────────────
const JOB = {
  title: "Line Cook",
  description: "Work a station on the line, prep to spec, plate to standard, keep to food safety rules.",
  requiredSkills: ["line cooking", "food safety", "food preparation", "menu development", "kitchen management"],
  niceToHaveSkills: ["inventory management"],
  minYears: 1,
  educationLevel: "Any",
  certifications: ["ServSafe"],
  hardFilters: { workPermitRequired: false, minYears: 0, mustHaveSkills: [] },
  weights: { skills: 50, experience: 30, education: 5, certifications: 5, keywords: 10 },
};
// ─────────────────────────────────────────────────────────────────────────

const buffer = fs.readFileSync(path.join(DIR, cvFile));
const r = await screenCv({ buffer, fileName: cvFile, mimeType: "application/pdf" }, JOB);

console.log(`\n${cvFile}  →  ${JOB.title}\n`);
console.log(`SCORE ${r.score}${r.needsManualReview ? "   ⚠ needs manual review" : ""}`);
if (r.reasons?.length) console.log("reasons: " + r.reasons.join(" | "));
console.log(`years ~${r.yearsExperience}   education ${r.educationLevel}   status ${r.status}`);
console.log(`matched: ${r.matchedSkills.join(", ") || "-"}`);
console.log(`missing: ${r.missingSkills.join(", ") || "-"}\n`);
for (const b of r.scoreBreakdown) {
  console.log(`  ${b.dimension.padEnd(15)} ${String(b.scored).padStart(3)}/${b.weight}   ${b.note}`);
}
