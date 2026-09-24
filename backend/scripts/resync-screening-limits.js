/**
 * Re-syncs every company's cvScreeningLimit to match its current plan.
 *
 * cvScreeningLimit is snapshotted onto the company when a plan is activated
 * (see activatePlan in shared/billing/subscription.js), so it can drift from
 * the plan's own value if the plan's limit was changed afterwards, or if the
 * company's limit was otherwise left stale. This brings every company back
 * in line with screeningLimitForPlan(company.plan) - the same lookup
 * enforcement uses - without touching usage history (Application rows),
 * which resets on its own each UTC calendar month.
 *
 * Companies with no plan (plan: null, the "cleared" state) are left alone;
 * their limit is deliberately 0 until the manager picks a plan again.
 *
 *   node scripts/resync-screening-limits.js          # report only
 *   node scripts/resync-screening-limits.js --apply  # write the change
 */
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
