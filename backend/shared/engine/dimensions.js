/**
 * The five scoring dimensions, each a pure function of the CV text and the
 * job's own criteria. Every function returns a 0..1 fraction plus whatever
 * detail the breakdown note needs.
 */
import { normalize, tokenize, levenshtein, cosineSimilarity, clamp } from "./text.js";

/* --------------------------------------------------------------- skills --- */

/**
 * Aliases so a CV that says "JS" still matches a job asking for "JavaScript".
 * Keys and values are compared normalised (lowercase). Bidirectional - a hit
 * on any variant counts.
 */
const SKILL_ALIASES = {
  /* --- software / IT --- */
  javascript: ["js", "ecmascript", "es6", "es2015"],
  typescript: ["ts"],
  "node.js": ["node", "nodejs", "node js"],
  react: ["react.js", "reactjs"],
  "next.js": ["next", "nextjs"],
  postgresql: ["postgres", "psql", "postgre"],
  mongodb: ["mongo"],
  "rest apis": ["rest", "restful", "rest api", "http api"],
  graphql: ["gql"],
  kubernetes: ["k8s"],
  "ci/cd": ["cicd", "ci cd", "continuous integration", "continuous delivery", "continuous deployment"],
  aws: ["amazon web services"],
  "google cloud": ["gcp", "google cloud platform"],
  "c#": ["c sharp", "csharp", "dotnet", ".net"],
  "c++": ["cpp", "cplusplus"],
  python: ["py"],
  sql: ["t-sql", "pl/sql", "mysql", "sqlite"],
  "data analysis": ["data analytics", "analytics"],

  /* --- design --- */
  "design systems": ["design system"],
  "user research": ["ux research", "usability testing"],
  "ux design": ["user experience design", "ux/ui", "ui/ux"],
  "ui design": ["user interface design"],
  wireframing: ["wireframe", "wireframes"],
  prototyping: ["prototype", "prototypes", "interactive prototypes"],
  "adobe photoshop": ["photoshop"],
  "adobe illustrator": ["illustrator"],
  figma: ["figjam"],

  /* --- healthcare / nursing --- */
  bls: ["basic life support"],
  acls: ["advanced cardiac life support", "advanced cardiovascular life support"],
  cpr: ["cardiopulmonary resuscitation"],
  ehr: ["emr", "electronic health record", "electronic health records", "electronic medical record", "electronic medical records"],
  "patient care": ["patient assessment", "direct patient care", "patient monitoring"],
  "iv therapy": ["intravenous therapy", "iv insertion"],
  "vital signs": ["vitals", "vitals monitoring"],
  hipaa: ["health insurance portability and accountability act"],
  phlebotomy: ["blood draw", "venipuncture"],

  /* --- accounting / finance / banking --- */
  "accounts payable": ["ap", "payables"],
  "accounts receivable": ["ar", "receivables"],
  gaap: ["generally accepted accounting principles"],
  ifrs: ["international financial reporting standards"],
  "financial reporting": ["financial statements", "financial statement preparation"],
  reconciliation: ["bank reconciliation", "account reconciliation", "reconciliations"],
  quickbooks: ["qb"],
  excel: ["microsoft excel", "ms excel", "spreadsheets", "pivot tables"],
  kyc: ["know your customer"],
  aml: ["anti money laundering", "anti-money laundering"],
  underwriting: ["loan underwriting", "credit underwriting"],

  /* --- legal --- */
  litigation: ["civil litigation", "trial preparation", "trial prep"],
  "legal research": ["case law research", "westlaw", "lexisnexis", "lexis nexis"],
  "contract drafting": ["contract review", "drafting contracts", "contract negotiation"],
  "regulatory compliance": ["compliance", "regulatory affairs"],

  /* --- education / teaching --- */
  "lesson planning": ["lesson plans", "curriculum development", "curriculum design"],
  "classroom management": ["behaviour management", "behavior management"],
  "differentiated instruction": ["differentiation"],
  "student assessment": ["formative assessment", "summative assessment", "grading"],
  iep: ["individualized education program", "individualised education program"],

  /* --- sales / marketing --- */
  crm: ["customer relationship management", "salesforce", "hubspot"],
  "lead generation": ["lead gen", "prospecting", "demand generation"],
  "b2b sales": ["business to business sales"],
  "account management": ["client management", "key account management"],
  seo: ["search engine optimization", "search engine optimisation"],
  sem: ["search engine marketing", "paid search", "ppc", "pay per click"],

  /* --- aviation --- */
  faa: ["federal aviation administration"],
  "a&p": ["airframe and powerplant", "airframe & powerplant", "a and p"],
  "crew resource management": ["crm training"],

  /* --- culinary --- */
  "food safety": ["haccp", "servsafe", "sanitation", "food hygiene"],
  "menu development": ["menu planning", "menu design", "recipe development"],
  "line cooking": ["line cook", "grill station", "saute station", "prep cook"],
  "kitchen management": ["back of house", "kitchen operations"],

  /* --- fitness --- */
  "personal training": ["personal trainer", "one on one training"],
  "group fitness": ["group exercise", "group classes"],
  "strength and conditioning": ["strength training", "s&c"],
  "nutrition planning": ["meal planning", "diet planning", "nutritional counseling", "nutritional counselling"],

  /* --- general business --- */
  "project management": ["pmp", "project coordination", "project delivery"],
  "stakeholder management": ["stakeholder engagement"],
  "microsoft office": ["ms office", "ms word", "microsoft word", "powerpoint"],
};

/** All the strings that should count as a hit for one required skill. */
function variantsFor(skill) {
  const key = normalize(skill);
  const set = new Set([key]);
  if (SKILL_ALIASES[key]) SKILL_ALIASES[key].forEach((a) => set.add(normalize(a)));
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.map(normalize).includes(key)) {
      set.add(canonical);
      aliases.forEach((a) => set.add(normalize(a)));
    }
  }
  return [...set].filter(Boolean);
}

/** Whole-word (or whole-phrase) presence test, punctuation-tolerant. */
function mentions(cvNorm, phrase) {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(cvNorm);
}

/** One skill is present if any variant is mentioned, or (for single words of
 *  5+ chars) a CV token is within one edit of it - catches "kubernetes" vs a
 *  typo'd "kubernetese". */
function skillPresent(cvNorm, cvTokens, skill) {
  const variants = variantsFor(skill);
  if (variants.some((v) => mentions(cvNorm, v))) return true;
  const key = normalize(skill);
  if (!key.includes(" ") && key.length >= 5) {
    return cvTokens.some((t) => Math.abs(t.length - key.length) <= 1 && levenshtein(t, key) <= 1);
  }
  return false;
}

export function scoreSkills(cvNorm, requiredSkills = [], niceToHaveSkills = []) {
  const cvTokens = tokenize(cvNorm);
  const matched = [];
  const missing = [];
  for (const skill of requiredSkills) {
    (skillPresent(cvNorm, cvTokens, skill) ? matched : missing).push(skill);
  }
  const niceMatched = niceToHaveSkills.filter((s) => skillPresent(cvNorm, cvTokens, s));

  const base = requiredSkills.length ? matched.length / requiredSkills.length : 1;
  const bonus = niceToHaveSkills.length ? 0.1 * (niceMatched.length / niceToHaveSkills.length) : 0;
  return { score01: clamp(base + bonus, 0, 1), matched, missing, niceMatched };
}

/* ----------------------------------------------------------- experience --- */

const YEAR = /\b(19|20)\d{2}\b/;
const RANGE = /\b((?:19|20)\d{2})\s*(?:[-–]|to|until)\s*((?:19|20)\d{2}|present|current|now|date)\b/gi;
const PHRASE = /\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b(?:[^.]{0,30}\bexperien)?/gi;

/**
 * Best-effort years of experience. Two independent signals, the larger wins:
 *   1. the widest "2019 – 2023" / "2020 – present" date range on the page
 *   2. the largest "N years [experience]" phrase
 * Date arithmetic on free-text CVs is the weakest part of the engine - treat
 * the number as approximate.
 */
export function estimateYears(cvNorm, rawText = cvNorm) {
  const now = new Date().getFullYear();
  let widest = 0;
  for (const m of rawText.matchAll(RANGE)) {
    const start = Number(m[1]);
    const endRaw = m[2].toLowerCase();
    const end = /^\d{4}$/.test(endRaw) ? Number(endRaw) : now;
    const span = end - start;
    if (span > 0 && span <= 45) widest = Math.max(widest, span);
  }
  let phrase = 0;
  for (const m of cvNorm.matchAll(PHRASE)) phrase = Math.max(phrase, Number(m[1]));

  return clamp(Math.round(Math.max(widest, phrase)), 0, 45);
}

export function scoreExperience(years, minYears) {
  if (minYears > 0) return clamp(years / minYears, 0, 1);
  return years > 0 ? 1 : 0.6; // no requirement → mild credit for any experience
}

/* ------------------------------------------------------------ education --- */

// Checked top-down; first hit wins. High school is tested before Diploma so
// "high school diploma" reads as level 1, not a post-secondary diploma.
const EDU_LADDER = [
  { level: 5, label: "PhD", re: /\b(ph\.?d|doctorate|d\.?phil|dphil)\b/i },
  { level: 4, label: "Master's degree", re: /\b(master|m\.?sc|msc|m\.?a\b|mba|m\.?eng|meng|m\.?tech|postgraduate)\b/i },
  { level: 3, label: "Bachelor's degree", re: /\b(bachelor|b\.?sc|bsc|b\.?a\b|b\.?eng|beng|b\.?tech|btech|undergraduate|licentiate)\b/i },
  { level: 1, label: "High school", re: /\b(high school|secondary school|a-?levels?|hsc|ged|matriculation)\b/i },
  { level: 2, label: "Diploma", re: /\b(diploma|associate degree|foundation degree|hnd)\b/i },
];

/** Rank the job's own `educationLevel` string by keyword (survives `normalize`
 *  turning "Bachelor's degree" into "bachelor s degree"). "Any" / "" → 0. */
function requiredRank(label) {
  const r = normalize(label || "");
  if (/\bph.?d\b|doctor/.test(r)) return 5;
  if (/\bmaster|\bmsc\b|\bmba\b|\bmeng\b|postgrad/.test(r)) return 4;
  if (/\bbachelor|\bbsc\b|\bbeng\b|\bbtech\b|undergrad|\bdegree\b/.test(r)) return 3;
  if (/\bdiploma|associate/.test(r)) return 2;
  if (/high school|secondary|a-?level/.test(r)) return 1;
  return 0;
}

export function detectEducation(cvNorm) {
  for (const rung of EDU_LADDER) {
    if (rung.re.test(cvNorm)) return { level: rung.level, label: rung.label };
  }
  return { level: 0, label: "-" };
}

export function scoreEducation(detectedLevel, requiredLabel) {
  const required = requiredRank(requiredLabel);
  if (required === 0) return 1; // "Any" / unspecified
  if (detectedLevel >= required) return 1;
  if (detectedLevel === 0) return 0.15; // nothing detected - small floor, not zero
  return clamp(1 - (required - detectedLevel) / 3, 0, 1);
}

/* -------------------------------------------------------- certifications --- */

export function scoreCertifications(cvNorm, certifications = []) {
  if (!certifications.length) return { score01: 1, matched: [] };
  const matched = certifications.filter((c) => cvNorm.includes(normalize(c)));
  return { score01: matched.length / certifications.length, matched };
}

/* ----------------------------------------------------------- keyword fit --- */

/**
 * Cosine similarity of the CV against the job's own words (title, description,
 * skill lists). Raw cosine on documents this short sits low (~0.05–0.35), so
 * it is stretched by 2.5× and capped - a rough "does this read like the job"
 * signal, nothing more.
 */
export function scoreKeywords(jobText, cvRawText) {
  const raw = cosineSimilarity(jobText, cvRawText);
  return { score01: clamp(raw * 2.5, 0, 1), raw };
}

/* --------------------------------------------------------------- titles --- */

const TITLE_WORDS =
  /\b(engineer|developer|manager|analyst|designer|consultant|lead|architect|specialist|coordinator|administrator|scientist|officer|director|intern|programmer)\b/i;

/** Grab the first couple of job-title-looking lines. Best-effort; the blind
 *  board hides these anyway, they are just context for the reviewer. */
export function guessTitles(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 60 && !l.includes("@") && !/https?:/i.test(l));

  const hits = [];
  for (const line of lines) {
    if (TITLE_WORDS.test(line) && !hits.includes(line)) hits.push(line);
    if (hits.length === 3) break;
  }
  return { currentTitle: hits[0] || "", pastTitles: hits.slice(1) };
}

/* ------------------------------------------------------- work eligibility --- */

const ELIGIBILITY = /\b(work permit|right to work|authori[sz]ed to work|permanent resident|pr status|citizen|citizenship|eu national|visa sponsorship not required|no sponsorship required)\b/i;

export function hasWorkEligibilitySignal(cvNorm) {
  return ELIGIBILITY.test(cvNorm);
}
