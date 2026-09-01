/**
 * Cross-domain sanity check: score every sample CV in this folder against a
 * handful of jobs from different domains, and print two matrices -
 *
 *   1. RAW   - weighted score, hard filters OFF
 *   2. REAL  - the job's real hard filters ON (a failed must-have skill / min
 *              years costs a flat −15 pts; nothing is blocked)
 *
 * Run:  node Resumes/sample-mix/run-matrix.mjs        (from the repo root)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { screenCv } from "../../backend/shared/engine/index.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".pdf")).sort();

/** Each job twice: `real` (with gates) and derived `raw` (gates removed). */
const JOBS = {
  "Registered Nurse": {
    description: "Critical care nursing: patient monitoring, medication administration, EHR records.",
    requiredSkills: ["patient care", "ACLS", "BLS", "IV therapy", "EHR", "vital signs"],
    niceToHaveSkills: ["phlebotomy", "HIPAA"],
    minYears: 2, educationLevel: "Bachelor's degree", certifications: ["ACLS"],
    hardFilters: { minYears: 1, mustHaveSkills: ["patient care"] },
    weights: { skills: 45, experience: 25, education: 15, certifications: 10, keywords: 5 },
  },
  "Staff Accountant": {
    description: "Month-end close, reconciliations, financial reporting, accounts payable and receivable.",
    requiredSkills: ["accounts payable", "accounts receivable", "reconciliation", "financial reporting", "GAAP", "Excel"],
    niceToHaveSkills: ["QuickBooks", "IFRS"],
    minYears: 2, educationLevel: "Bachelor's degree", certifications: ["CPA"],
    hardFilters: { minYears: 1, mustHaveSkills: ["reconciliation"] },
    weights: { skills: 40, experience: 25, education: 15, certifications: 15, keywords: 5 },
  },
  "High School Teacher": {
    description: "Plan and deliver lessons, manage the classroom, assess student progress.",
    requiredSkills: ["lesson planning", "classroom management", "student assessment", "differentiated instruction", "curriculum development"],
    niceToHaveSkills: ["IEP"],
    minYears: 1, educationLevel: "Bachelor's degree", certifications: ["teaching license"],
    hardFilters: { minYears: 0, mustHaveSkills: ["lesson planning"] },
    weights: { skills: 40, experience: 20, education: 25, certifications: 10, keywords: 5 },
  },
  "Backend Engineer": {
    description: "Design and run backend services and REST APIs at scale.",
    requiredSkills: ["Node.js", "TypeScript", "PostgreSQL", "REST APIs", "Docker", "AWS"],
    niceToHaveSkills: ["Kubernetes", "GraphQL"],
    minYears: 5, educationLevel: "Bachelor's degree", certifications: ["AWS Solutions Architect"],
    hardFilters: { minYears: 3, mustHaveSkills: ["Node.js"] },
    weights: { skills: 45, experience: 25, education: 10, certifications: 10, keywords: 10 },
  },
  "Line Cook": {
    description: "Work a station on the line, prep, plate to spec, keep to food safety standards.",
    requiredSkills: ["line cooking", "food safety", "food preparation", "menu development", "kitchen management"],
    niceToHaveSkills: [],
    minYears: 1, educationLevel: "Any", certifications: ["ServSafe"],
    hardFilters: { minYears: 0, mustHaveSkills: [] },
    weights: { skills: 50, experience: 30, education: 5, certifications: 5, keywords: 10 },
  },
};

const names = Object.keys(JOBS);
const noGates = (j) => ({ ...j, hardFilters: { minYears: 0, mustHaveSkills: [], workPermitRequired: false } });

async function matrix(label, transform) {
  const rows = [];
  for (const f of files) {
    const buffer = fs.readFileSync(path.join(DIR, f));
    const rec = { cv: f.replace(".pdf", "") };
    for (const n of names) {
      const r = await screenCv({ buffer, fileName: f, mimeType: "application/pdf" }, transform(JOBS[n]));
      rec[n] = r.needsManualReview ? `${r.score}!` : `${r.score}`;
    }
    rows.push(rec);
  }
  const w = Math.max(...rows.map((r) => r.cv.length), 3);
  console.log(`\n### ${label}\n`);
  console.log("CV".padEnd(w) + " | " + names.map((n) => n.slice(0, 18).padStart(18)).join(" | "));
  console.log("-".repeat(w) + "-+-" + names.map(() => "-".repeat(18)).join("-+-"));
  for (const r of rows) {
    console.log(r.cv.padEnd(w) + " | " + names.map((n) => String(r[n]).padStart(18)).join(" | "));
  }
}

await matrix("RAW - weighted score, hard filters OFF", noGates);
await matrix("REAL - hard filters ON  (failed must-have / min-years = −15 pts, never blocked)", (j) => j);
console.log("\nExpect the diagonal-ish pattern: a CV scores highest against the job from its own domain.");
