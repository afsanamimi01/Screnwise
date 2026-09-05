/**
 * Build a demo CV that stands behind an application's numbers.
 *
 * The seeded dataset described candidates it had no documents for: a row said
 * "self-applied, 82%, 6 years, Bachelor's", and there was nothing to open. This
 * writes the document that row implies - the matched skills present, the missing
 * ones genuinely absent, a date range that spans the stated years, and a degree
 * line the education ladder recognises - so re-screening it lands on roughly the
 * score the row already carried.
 *
 * Demo data only. Nothing here runs in the product path.
 */
import { renderPdf } from "./pdf.js";

/** A phrase for each rung of the engine's education ladder. */
const DEGREE_LINE = {
  PhD: "PhD in Computer Science - University of Dhaka, 2016",
  "Master's degree": "MSc in Computer Science and Engineering - University of Dhaka, 2018",
  "Bachelor's degree": "BSc in Computer Science and Engineering - BUET, 2019",
  Diploma: "Diploma in Information Technology - Dhaka Polytechnic Institute, 2018",
  "High school": "HSC in Science - Dhaka College, 2017",
};

/** Bullet shapes, kept generic so any role's skills can be dropped into them. */
const BULLETS = [
  (s) => `Delivered production work using ${s}, from first design through to release.`,
  (s) => `Owned the ${s} side of the team's day-to-day delivery.`,
  (s) => `Improved how the team applies ${s}, and documented it for everyone else.`,
  (s) => `Handled ${s} across several concurrent client engagements.`,
  (s) => `Reviewed and mentored colleagues on ${s}.`,
];

/** What fraction of a dimension the seeded row claimed, e.g. 7/10 -> 0.7. */
function ratioFor(app, dimension) {
  const row = (app.scoreBreakdown ?? []).find((d) => d.dimension === dimension);
  if (!row || !row.weight) return 1;
  return Math.max(0, Math.min(1, row.scored / row.weight));
}

/**
 * A skill must not leak into the prose if the row says the candidate lacks it -
 * the engine matches on the whole document, so a stray mention would silently
 * turn a missing skill into a matched one.
 */
function mentionsMissing(text, missingSkills) {
  const haystack = String(text).toLowerCase();
  return missingSkills.some((s) => haystack.includes(String(s).toLowerCase()));
}

function safeJoin(values, missingSkills) {
  return values.filter((v) => v && !mentionsMissing(v, missingSkills)).join(", ");
}

/**
 * Compose the CV for one application.
 *
 * `options` are the dials `fitCvToScore` turns to land on a target score: how
 * many of the job's required skills the candidate can show, how long they have
 * been working, which degree they hold, and how much of the job's own
 * vocabulary their summary echoes. Left out, the application's stored facts are
 * used as they are.
 *
 * @param {object} app  the application document (plain or mongoose)
 * @param {object} job  the job it was submitted to
 * @param {{ skillCount?: number, years?: number, educationLabel?: string, echo?: number }} [options]
 * @returns {{ buffer: Buffer, fileName: string, contentType: string }}
 */
export function buildCv(app, job, options = {}) {
  const now = new Date().getFullYear();
  const required = job.requiredSkills ?? [];

  // Which required skills this CV can evidence. Everything else must stay off
  // the page entirely, or the engine would match it.
  const skillCount =
    options.skillCount ?? (app.matchedSkills ?? []).length ?? Math.ceil(required.length / 2);
  const matched = required.length
    ? required.slice(0, Math.max(0, Math.min(required.length, skillCount)))
    : (app.matchedSkills ?? []);
  const missing = required.length
    ? required.slice(matched.length)
    : (app.missingSkills ?? []);
  const years = Math.max(0, options.years ?? app.yearsExperience ?? 0);
  const educationLabel = options.educationLabel ?? app.educationLevel;
  const echo = options.echo ?? 1;
  const titles = [app.currentTitle, ...(app.pastTitles ?? [])].filter(Boolean);
  const currentTitle = titles[0] || `${job.title} candidate`;

  const lines = [];
  const add = (text, opts = {}) => lines.push({ text, ...opts });

  /* --- header -------------------------------------------------------- */
  add(app.name, { bold: true, size: 16 });
  add([app.email, app.phone, job.location || "Dhaka, Bangladesh"].filter(Boolean).join("  -  "));
  add(currentTitle, { bold: true });

  /* --- summary ------------------------------------------------------- */
  add("SUMMARY", { bold: true, size: 11, gap: 1 });
  const focus = safeJoin(matched.slice(0, 3), missing);
  add(
    years > 0
      ? `${currentTitle} with ${years} years of experience${focus ? `, working mainly with ${focus}` : ""}.`
      : `${currentTitle} starting out${focus ? `, with project work in ${focus}` : ""}.`,
  );
  // Echoing the posting's own words lifts the keyword dimension; how much is
  // one of the dials, because a strong CV reads like the job and a weak one
  // does not.
  if (echo >= 1 && !mentionsMissing(job.title, missing)) {
    add(`Applying for the ${job.title} role${job.department ? ` in ${job.department}` : ""}.`);
  }
  if (echo >= 2) {
    const sentences = String(job.description ?? "")
      .split(/(?<=\.)\s+/)
      .filter((line) => line.trim() && !mentionsMissing(line, missing))
      .slice(0, echo - 1);
    sentences.forEach((line) => add(line.trim().slice(0, 110)));
  }

  /* --- skills -------------------------------------------------------- */
  if (matched.length) {
    add("CORE SKILLS", { bold: true, size: 11, gap: 1 });
    // Wrapped by hand: the writer draws lines, it does not reflow text.
    for (let i = 0; i < matched.length; i += 6) {
      add(matched.slice(i, i + 6).join("  -  "));
    }
  }

  /* --- experience ---------------------------------------------------- */
  add("WORK EXPERIENCE", { bold: true, size: 11, gap: 1 });
  if (years > 0) {
    // One range that spans the stated years, so `estimateYears` reads it back.
    const start = now - years;
    add(`${currentTitle}`, { bold: true });
    add(`Techno Solutions Ltd, Dhaka        ${start} - Present`);
    matched.slice(0, 3).forEach((skill, i) => add(`  - ${BULLETS[i % BULLETS.length](skill)}`));

    if (titles[1] && years >= 3) {
      const prevEnd = start;
      const prevStart = Math.max(now - years - 2, prevEnd - 2);
      add(titles[1], { bold: true, gap: 1 });
      add(`Bengal Software, Dhaka        ${prevStart} - ${prevEnd}`);
      matched.slice(3, 5).forEach((skill, i) => add(`  - ${BULLETS[(i + 3) % BULLETS.length](skill)}`));
    }
  } else {
    add(`Intern, Techno Solutions Ltd`, { bold: true });
    add("Academic and personal project work; no full-time role yet.");
    matched.slice(0, 2).forEach((skill, i) => add(`  - Built a small project using ${skill}.`));
  }

  /* --- certifications ------------------------------------------------ */
  // Only as many as the row's certification score claimed.
  const jobCerts = job.certifications ?? [];
  if (jobCerts.length) {
    const held = jobCerts.slice(0, Math.round(ratioFor(app, "Certifications") * jobCerts.length));
    if (held.length) {
      add("CERTIFICATIONS", { bold: true, size: 11, gap: 1 });
      held.forEach((c) => add(`  - ${c}`));
    }
  }

  /* --- education ----------------------------------------------------- */
  add("EDUCATION", { bold: true, size: 11, gap: 1 });
  add(DEGREE_LINE[educationLabel] ?? DEGREE_LINE["Bachelor's degree"]);

  /* --- work eligibility ---------------------------------------------- */
  // Only when the job asks, and only for rows that were not penalised for it.
  if (job.hardFilters?.workPermitRequired && ratioFor(app, "Skills match") > 0.4) {
    add("ELIGIBILITY", { bold: true, size: 11, gap: 1 });
    add("Bangladeshi citizen with the right to work; no sponsorship required.");
  }

  const slug = String(app.name || "candidate")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    buffer: renderPdf(lines),
    fileName: `${slug || "candidate"}-cv.pdf`,
    contentType: "application/pdf",
  };
}

/** Education rungs, weakest first - the search only ever walks this downwards. */
const EDUCATION_RUNGS = ["High school", "Diploma", "Bachelor's degree", "Master's degree", "PhD"];

/**
 * Build the CV that makes the engine reproduce a target score.
 *
 * The seeded rows carried scores that were never produced by the engine, so a
 * faithful CV for one of them scores well above the number on the board. Rather
 * than let the demo's whole ranking drift upwards, this searches the dials for
 * the document that actually earns the score the row claims: fewer of the
 * required skills evidenced, a shorter history, a lower degree, a summary that
 * reads less like the posting.
 *
 * Coarse pass on the skill count (which carries the most weight), then a finer
 * pass over the remaining dials, keeping whichever combination came closest.
 *
 * @param {object} app
 * @param {object} job
 * @param {(file: object) => Promise<object>} screen  runs the engine on a file
 * @param {{ target?: number, tolerance?: number }} [opts]
 */
export async function fitCvToScore(app, job, screen, opts = {}) {
  const target = opts.target ?? app.score ?? 0;
  const tolerance = opts.tolerance ?? 2;
  const required = job.requiredSkills ?? [];

  let best = null;
  let evaluations = 0;

  const evaluate = async (dials) => {
    const cv = buildCv(app, job, dials);
    const result = await screen({
      buffer: cv.buffer,
      fileName: cv.fileName,
      mimeType: cv.contentType,
    });
    evaluations++;
    const drift = result.score - target;
    if (!best || Math.abs(drift) < Math.abs(best.drift)) best = { cv, result, drift, dials };
    return drift;
  };

  // Coarse: walk the skill count down until the score stops overshooting.
  const baseYears = Math.max(0, app.yearsExperience ?? 0);
  let chosenSkillCount = required.length;
  for (let count = required.length; count >= 0; count--) {
    const drift = await evaluate({ skillCount: count, years: baseYears, echo: 1 });
    chosenSkillCount = count;
    if (Math.abs(drift) <= tolerance) return { ...best, evaluations };
    if (drift < 0) break; // undershooting now - the bracket is here
  }

  // Fine: the remaining dials, around the bracketing skill count.
  const eduIndex = Math.max(0, EDUCATION_RUNGS.indexOf(app.educationLevel));
  for (const count of [chosenSkillCount, chosenSkillCount + 1]) {
    if (count < 0 || count > required.length) continue;
    for (const echo of [0, 1, 2, 3]) {
      for (const years of [baseYears, Math.max(0, baseYears - 2), baseYears + 2]) {
        for (const edu of [app.educationLevel, EDUCATION_RUNGS[Math.max(0, eduIndex - 1)]]) {
          const drift = await evaluate({ skillCount: count, years, echo, educationLabel: edu });
          if (Math.abs(drift) <= tolerance) return { ...best, evaluations };
        }
      }
    }
  }

  return { ...best, evaluations };
}

/**
 * Attach a fitted CV to one application and re-score it from that document.
 *
 * Mutates `app` (it is a mongoose doc in both callers) and returns the drift
 * from the score the row carried before. Used by the seed and by
 * `scripts/backfill-demo-cvs.js`, so a fresh seed and an existing database end
 * up with the same property: every self-applied score has a file behind it.
 *
 * @returns {Promise<{ drift: number, unreadable: boolean }>}
 */
export async function attachFittedCv(app, job, screen) {
  const before = app.score;
  const { cv, result } = await fitCvToScore(app, job, screen);

  if (result.scoreBreakdown[0]?.dimension === "File") {
    return { drift: 0, unreadable: true };
  }

  app.cv = {
    data: cv.buffer,
    contentType: cv.contentType,
    fileName: cv.fileName,
    size: cv.buffer.length,
    uploadedAt: app.appliedAt ?? new Date(),
  };
  app.cvFileName = cv.fileName;
  // The score has to come from the document now, not the other way round.
  app.score = result.score;
  app.scoreBreakdown = result.scoreBreakdown;
  app.matchedSkills = result.matchedSkills;
  app.missingSkills = result.missingSkills;
  app.yearsExperience = result.yearsExperience;
  app.educationLevel = result.educationLevel;

  return { drift: result.score - before, unreadable: false };
}
