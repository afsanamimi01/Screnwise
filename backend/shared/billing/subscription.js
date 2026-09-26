import User from "../models/User.model.js";
import Plan from "../models/Plan.model.js";
import Job from "../models/Job.model.js";
import Application from "../models/Application.model.js";

const FALLBACK_SEATS = { basic: 2, advance: 5, custom: null };
const FALLBACK_SCREENING = { basic: 500, advance: 2500, custom: null };
export const SUBSCRIPTION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export const PLAN_KEYS = ["basic", "advance", "custom"];

/** Seats the plan allows, `null` for unlimited. */
export async function seatLimitForPlan(planKey) {
  const plan = await Plan.findOne({ key: planKey });
  if (plan) return plan.hrSeatLimit ?? null;
  return FALLBACK_SEATS[planKey] ?? null;
}

export async function seatUsage(companyId) {
  const [used, total] = await Promise.all([
    User.countDocuments({ companyId, role: "hr", active: true }),
    User.countDocuments({ companyId, role: "hr" }),
  ]);
  return { used, total };
}

/** Would this plan leave company over its seat limit? */
export async function seatConflict(companyId, planKey) {
  const limit = await seatLimitForPlan(planKey);
  if (limit == null) return null;
  const { used } = await seatUsage(companyId);
  if (used <= limit) return null;
  return `The ${planKey} plan allows ${limit} HR seats but you have ${used} active. Deactivate some first.`;
}

/** CVs-screened cap the plan allows per calendar month, `null` for unlimited. */
export async function screeningLimitForPlan(planKey) {
  const plan = await Plan.findOne({ key: planKey });
  if (plan) return plan.cvScreeningLimit ?? null;
  return FALLBACK_SCREENING[planKey] ?? null;
}

/** `[start, end)` of the current UTC calendar month. */
function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

/** CVs screened this calendar month. */
export async function screeningUsage(companyId) {
  const { start, end } = currentMonthRange();
  const jobIds = await Job.find({ companyId }).distinct("_id");
  const used = await Application.countDocuments({
    jobId: { $in: jobIds },
    appliedAt: { $gte: start, $lt: end },
  });
  return { used, periodStart: start, periodEnd: end };
}

/** Company's monthly cap plus usage so far. */
export async function screeningStatus(company) {
  const { used } = await screeningUsage(company._id);
  const limit = company.cvScreeningLimit ?? null;
  const remaining = limit == null ? null : Math.max(0, limit - used);
  return { limit, used, remaining };
}

/** Apply a plan to a company and start its subscription. */
export async function activatePlan(company, planKey) {
  const firstPick = !company.plan;
  const renewal = company.plan === planKey;

  company.plan = planKey;
  company.hrSeatLimit = await seatLimitForPlan(planKey);
  company.cvScreeningLimit = await screeningLimitForPlan(planKey);

  const current = company.subscriptionExpiresAt?.getTime() ?? 0;
  const from = Math.max(Date.now(), current);
  if (firstPick || !company.subscriptionStartedAt) company.subscriptionStartedAt = new Date();
  company.subscriptionExpiresAt = new Date(from + SUBSCRIPTION_DAYS * DAY);

  await company.save();
  return { firstPick, renewal };
}
