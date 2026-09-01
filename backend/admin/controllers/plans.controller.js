import Plan from "../../shared/models/Plan.model.js";
import { logAudit } from "../../shared/utils/audit.js";

const EDITABLE = ["name", "tagline", "price", "period", "cta", "featured", "hrSeatLimit", "features"];

/** Public - feeds the marketing pricing page. */
export async function listPlans(req, res, next) {
  try {
    const plans = await Plan.find().sort({ order: 1 });
    res.json(plans);
  } catch (err) {
    next(err);
  }
}

/** Super admin only - edit pricing-card content for one plan. */
export async function updatePlan(req, res, next) {
  try {
    const plan = await Plan.findOne({ key: req.params.key });
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) plan[field] = req.body[field];
    }
    await plan.save();
    await logAudit(req.user.name, "Pricing updated", `${plan.key} plan`);
    res.json(plan.toJSON());
  } catch (err) {
    next(err);
  }
}
