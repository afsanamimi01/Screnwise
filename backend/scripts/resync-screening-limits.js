/** Re-syncs every company's cvScreeningLimit to its current plan. */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import Company from "../shared/models/Company.model.js";
import { screeningLimitForPlan } from "../shared/billing/subscription.js";

const apply = process.argv.includes("--apply");

try {
  await connectDB();

  const companies = await Company.find({ plan: { $ne: null } }).select("name plan cvScreeningLimit");

  const changes = [];
  for (const c of companies) {
    const correct = await screeningLimitForPlan(c.plan);
    if (correct !== c.cvScreeningLimit) {
      changes.push({ company: c, from: c.cvScreeningLimit, to: correct });
    }
  }

  if (!changes.length) {
    console.log(`${companies.length} company(ies) with a plan - all already match their plan's limit.`);
  } else {
    console.log(`${changes.length} of ${companies.length} company(ies) are out of sync:`);
    for (const { company, from, to } of changes) {
      console.log(`  ${company.name} (${company.plan}): ${from ?? "unlimited"} -> ${to ?? "unlimited"}`);
    }

    if (apply) {
      for (const { company, to } of changes) {
        company.cvScreeningLimit = to;
        await company.save();
      }
      console.log(`\nUpdated ${changes.length} company(ies).`);
    } else {
      console.log("\nDry run - nothing written. Re-run with --apply to write these changes.");
    }
  }

  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error("Failed:", err);
  process.exit(1);
}
