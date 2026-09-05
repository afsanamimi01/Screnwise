import Company from "../../shared/models/Company.model.js";
import User from "../../shared/models/User.model.js";
import Job from "../../shared/models/Job.model.js";
import { logAudit } from "../../shared/utils/audit.js";

const DAY = 24 * 60 * 60 * 1000;
const RENEW_DAYS = 30;

/** All companies with their manager, seat usage, job count and access state. */
export async function listCompanies(req, res, next) {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });

    const rows = await Promise.all(
      companies.map(async (c) => {
        const [manager, hrActive, hrTotal, jobs] = await Promise.all([
          User.findOne({ companyId: c._id, role: "manager" }).select("name email"),
          User.countDocuments({ companyId: c._id, role: "hr", active: true }),
          User.countDocuments({ companyId: c._id, role: "hr" }),
          Job.countDocuments({ companyId: c._id }),
        ]);
        return {
          ...c.toJSON(),
          manager: manager ? { name: manager.name, email: manager.email } : null,
          hrSeatsUsed: hrActive,
          hrCount: hrTotal,
          jobCount: jobs,
        };
      }),
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/companies/:id  { action: "renew" | "revoke" | "clear" }
 *
 * renew  → status active, expiry pushed RENEW_DAYS from today
 * revoke → status revoked (expiry untouched)
 * clear  → the subscription is removed and the company is put back exactly
 *          where a freshly registered one starts: no plan, no seats, no
 *          expiry, but still `active`. Nothing else is touched - the jobs,
 *          candidates, HR accounts and history all survive; the manager simply
 *          has to choose a plan again before the workspace unlocks.
 */
export async function updateCompanyAccess(req, res, next) {
  try {
    const { action } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    if (action === "revoke") {
      company.status = "revoked";
    } else if (action === "renew") {
      company.status = "active";
      const from = company.subscriptionExpiresAt
        ? Math.max(Date.now(), company.subscriptionExpiresAt.getTime())
        : Date.now();
      company.subscriptionExpiresAt = new Date(from + RENEW_DAYS * DAY);
      if (!company.subscriptionStartedAt) company.subscriptionStartedAt = new Date();
    } else if (action === "clear") {
      // Deliberately not a revoke: the company is not blocked, it just has
      // nothing bought. `plan: null` is what `requireActivePlan` reads, and
      // what makes the manager's console show the plan chooser again.
      company.plan = null;
      company.hrSeatLimit = 0;
      company.subscriptionStartedAt = null;
      company.subscriptionExpiresAt = null;
      company.status = "active";
    } else {
      return res.status(400).json({ message: "action must be 'renew', 'revoke' or 'clear'" });
    }

    await company.save();
    const ACTION_LABEL = {
      revoke: "Company access revoked",
      renew: "Company subscription renewed",
      clear: "Company subscription cleared",
    };
    await logAudit(
      req.user.name,
      ACTION_LABEL[action],
      action === "clear" ? `${company.name} - back to no plan` : company.name,
      company._id,
    );
    res.json(company.toJSON());
  } catch (err) {
    next(err);
  }
}
