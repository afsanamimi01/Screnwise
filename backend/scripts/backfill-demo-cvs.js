/**
 * Give every self-applied demo application the CV its numbers imply.
 *
 * The seeded dataset described candidates with no document behind them: a row
 * said "self-applied, 82%, 6 years, Bachelor's" and there was nothing for a
 * recruiter to open after shortlisting. This builds that document from the
 * row's own facts (`shared/demo/cv.js`), then screens it with the real engine
 * and stores the result - so the score on the board comes from a file that
 * exists, and the breakdown can be checked against it line by line.
 *
 * Skipped:
 *   - HR-uploaded rows: the product deliberately does not keep those bytes.
 *   - `needsManualReview` rows: they stand in for CVs that could not be read.
 *   - anything that already has a CV attached.
 *
 *   node scripts/backfill-demo-cvs.js          # report the drift, write nothing
 *   node scripts/backfill-demo-cvs.js --apply  # attach the CVs and re-score
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import Application from "../shared/models/Application.model.js";
import Job from "../shared/models/Job.model.js";
import Candidate from "../shared/models/Candidate.model.js";
import { attachFittedCv } from "../shared/demo/cv.js";
import { screenCv } from "../shared/engine/index.js";

const apply = process.argv.includes("--apply");
const limit = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

try {
  await connectDB();

  // A candidate who really uploaded a CV keeps it - attaching a generated copy
  // to their application would shadow the genuine document.
  const withRealCv = await Candidate.find({ "cv.data": { $exists: true } }).select("userId");
  const realCvUserIds = withRealCv.map((c) => c.userId);

  const query = {
    source: "self-applied",
    needsManualReview: false,
    "cv.data": { $exists: false },
    candidateId: { $nin: realCvUserIds },
  };
  let cursor = Application.find(query).sort({ _id: 1 });
  if (limit) cursor = cursor.limit(limit);
  const apps = await cursor;

  if (!apps.length) {
    console.log("Every self-applied application already has a CV.");
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`${apps.length} self-applied application(s) without a CV.\n`);
  console.log("  old  new  drift  candidate");
  console.log("  ---  ---  -----  ---------");

  const jobs = new Map();
  let drifts = [];
  let failures = 0;

  for (const app of apps) {
    if (!jobs.has(app.jobId.toString())) {
      jobs.set(app.jobId.toString(), await Job.findById(app.jobId));
    }
    const job = jobs.get(app.jobId.toString());
    if (!job) continue;

    // Fit the document to the score the row already shows, so the board's
    // ranking survives the change and every number becomes checkable. On a dry
    // run the mutation stays in memory and is never saved.
    const before = app.score;
    const { unreadable } = await attachFittedCv(app, job, (file) => screenCv(file, job));
    if (unreadable) {
      failures++;
      console.log(`  !! generated CV was unreadable for ${app.name}`);
      continue;
    }

    const drift = app.score - before;
    drifts.push(drift);
    if (drifts.length <= 15 || Math.abs(drift) > 15) {
      const sign = drift > 0 ? `+${drift}` : `${drift}`;
      console.log(
        `  ${String(before).padStart(3)}  ${String(app.score).padStart(3)}  ${sign.padStart(5)}  ${app.name} - ${job.title}`,
      );
    }

    if (apply) await app.save();
  }

  const abs = drifts.map(Math.abs);
  const mean = abs.length ? (abs.reduce((a, b) => a + b, 0) / abs.length).toFixed(1) : "0";
  const within = abs.filter((d) => d <= 10).length;

  console.log(`\n  ${drifts.length} scored · mean drift ${mean} pts · ${within} within 10 pts`);
  if (failures) console.log(`  ${failures} generated CV(s) could not be parsed back`);
  console.log(
    apply
      ? "\n  Written. Scores now come from the attached CVs."
      : "\n  Dry run - nothing written. Re-run with --apply.",
  );

  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error("Failed:", err);
  process.exit(1);
}
