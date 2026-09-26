import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import Application from "../shared/models/Application.model.js";
import Candidate from "../shared/models/Candidate.model.js";
import { extractText } from "../shared/engine/extract.js";

/** Recover CV text for applications screened before cvText existed. */
const dryRun = process.argv.includes("--dry-run");

async function main() {
  await connectDB();

  const targets = await Application.find({
    $or: [{ cvText: { $exists: false } }, { cvText: "" }],
  })
    .select("+cvText candidateId cv cvFileName source")
    .limit(Number(process.env.BACKFILL_LIMIT || 5000));

  console.log(`${targets.length} applications without CV text.`);

  // One lookup for every profile CV that might stand in for a missing copy.
  const candidateIds = [...new Set(targets.map((a) => a.candidateId).filter(Boolean).map(String))];
  const profiles = candidateIds.length
    ? await Candidate.find({ userId: { $in: candidateIds } }).select("userId cv").lean()
    : [];
  const profileByUser = new Map(profiles.map((p) => [String(p.userId), p.cv]));

  let recovered = 0;
  let unreadable = 0;
  let noBytes = 0;

  for (const app of targets) {
    // The submission's own copy wins: it is the document that produced the score.
    const cv =
      app.cv?.data ? app.cv : app.candidateId ? profileByUser.get(String(app.candidateId)) : null;

    if (!cv?.data) {
      noBytes++;
      continue;
    }

    const extracted = await extractText({
      buffer: cv.data,
      fileName: cv.fileName || app.cvFileName || "cv.pdf",
      mimeType: cv.contentType,
    });

    if (!extracted.ok || extracted.text.trim().length < 40) {
      unreadable++;
      continue;
    }

    recovered++;
    if (!dryRun) {
      await Application.updateOne({ _id: app._id }, { $set: { cvText: extracted.text } });
    }
  }

  console.log(
    `${recovered} recovered, ${unreadable} unreadable, ${noBytes} had no stored bytes ` +
      "(HR-uploaded batches from before retention - not recoverable).",
  );
  if (dryRun) console.log("Dry run - nothing written.");
  else console.log("Now run: node scripts/rag-index.js --only=cv");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
