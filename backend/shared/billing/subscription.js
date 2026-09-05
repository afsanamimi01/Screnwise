/**
 * Turning a plan choice into an active subscription.
 *
 * Two paths reach this: a manager picking a plan directly (when no gateway is
 * configured, or for the Custom plan that is agreed offline), and a confirmed
 * SSLCommerz payment. Both must apply the same seat limits and the same
 * expiry, so the rule lives here rather than in either controller.
 */
import User from "../models/User.model.js";
import Plan from "../models/Plan.model.js";

const FALLBACK_SEATS = { basic: 2, advance: 5, custom: null };
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

/**
 * Would this plan leave the company over its seat limit?
 *
 * Checked before payment as well as before a free switch - taking money for a
 * downgrade that then cannot be applied would be worse than refusing early.
 *
 * @returns {Promise<string|null>} the reason to refuse, or null if it is fine
 */
export async function seatConflict(companyId, planKey) {
  const limit = await seatLimitForPlan(planKey);
  if (limit == null) return null;
  const { used } = await seatUsage(companyId);
  if (used <= limit) return null;
  return `The ${planKey} plan allows ${limit} HR seats but you have ${used} active. Deactivate some first.`;
}

/**
 * Apply a plan to a company and start (or extend) its subscription.
 *
 * A renewal of the same plan extends from whichever is later: now, or the
 * current expiry - so paying early never costs the customer the days they
 * already have.
 *
 * @returns {Promise<{ firstPick: boolean, renewal: boolean }>}
 */
export async function activatePlan(company, planKey) {
  const firstPick = !company.plan;
  const renewal = company.plan === planKey;

  company.plan = planKey;
  company.hrSeatLimit = await seatLimitForPlan(planKey);

  const current = company.subscriptionExpiresAt?.getTime() ?? 0;
  const from = Math.max(Date.now(), current);
  if (firstPick || !company.subscriptionStartedAt) company.subscriptionStartedAt = new Date();
  company.subscriptionExpiresAt = new Date(from + SUBSCRIPTION_DAYS * DAY);

  await company.save();
  return { firstPick, renewal };
}
