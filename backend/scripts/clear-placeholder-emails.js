/**
 * One-off repair for CVs uploaded before the parser read contact details.
 *
 * The old uploader built an address out of the file name
 * (`jordan-blake-cv.pdf` -> `jordan.blake@example.com`). Those addresses look
 * real in the composer but belong to nobody, so a send goes nowhere - or, worse,
 * to a stranger who happens to own the address. This clears them, which is the
 * state an unparsed CV should have had all along: the composer then shows the
 * candidate as unreachable rather than offering to write to them.
 *
 * Only HR-uploaded rows on a reserved test domain are touched. Self-applied
 * candidates keep the address they registered with.
 *
 *   node scripts/clear-placeholder-emails.js          # report only
 *   node scripts/clear-placeholder-emails.js --apply  # write the change
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import Application from "../shared/models/Application.model.js";

/** RFC 2606 reserved domains - guaranteed to belong to no one. */
const PLACEHOLDER = /@(example\.(com|org|net)|test|invalid|localhost)$/i;

const apply = process.argv.includes("--apply");

try {
  await connectDB();

  const rows = await Application.find({
    source: "HR-uploaded",
    email: { $regex: PLACEHOLDER },
  }).select("_id name email jobId");

  if (!rows.length) {
    console.log("No placeholder addresses found on HR-uploaded applications.");
  } else {
    console.log(`${rows.length} HR-uploaded application(s) carry a placeholder address:`);
    for (const row of rows.slice(0, 20)) console.log(`  ${row.name} <${row.email}>`);
    if (rows.length > 20) console.log(`  ... and ${rows.length - 20} more`);

    if (apply) {
      const result = await Application.updateMany(
        { _id: { $in: rows.map((r) => r._id) } },
        { $set: { email: "" } },
      );
      console.log(`\nCleared ${result.modifiedCount} address(es).`);
      console.log("Re-upload those CVs to pick up whatever address they actually print.");
    } else {
      console.log("\nDry run - nothing written. Re-run with --apply to clear them.");
    }
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error("Failed:", err);
  process.exit(1);
}
