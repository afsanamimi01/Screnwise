import Plan from "../../shared/models/Plan.model.js";
import { logAudit } from "../../shared/utils/audit.js";

/** Editable fields, in the same order the admin pricing card shows them. */
const EDITABLE = [
  "name",
  "price",
  "period",
  "cta",
  "tagline",
  "featured",
  "hrSeatLimit",
  "cvScreeningLimit",
  "features",
];

/** Public - feeds the marketing pricing page. */
export async function listPlans(req, res, next) {
  try {
    // ---- Sort config ----
    const SORT_BY = "order asc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const allPlans = await Plan.find().sort({ [sortField]: sortOrder });

    const rows = [];
    for (const plan of allPlans) {
      // ---- Field: Name ----
      const name = plan.name;

      // ---- Field: Price ----
      const price = plan.price;

      // ---- Field: Period ----
      const period = plan.period;

      // ---- Field: CTA label ----
      const cta = plan.cta;

      // ---- Field: Tagline ----
      const tagline = plan.tagline;

      // ---- Field: Featured ----
      const featured = plan.featured;

      // ---- Field: HR seat limit ----
      const hrSeatLimit = plan.hrSeatLimit;

      // ---- Field: CV screening limit ----
      const cvScreeningLimit = plan.cvScreeningLimit;

      // ---- Field: Features ----
      const features = plan.features;

      rows.push({
        ...plan.toJSON(),
        name,
        price,
        period,
        cta,
        tagline,
        featured,
        hrSeatLimit,
        cvScreeningLimit,
        features,
      });
    }

    res.json(rows);
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
