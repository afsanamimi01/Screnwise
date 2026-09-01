import bcrypt from "bcryptjs";
import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import Plan from "../../shared/models/Plan.model.js";
import { logAudit } from "../../shared/utils/audit.js";

const FALLBACK_SEATS = { basic: 2, advance: 5, custom: null };
const SUBSCRIPTION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

async function seatLimitForPlan(planKey) {
  const plan = await Plan.findOne({ key: planKey });
  if (plan) return plan.hrSeatLimit ?? null;
  return FALLBACK_SEATS[planKey] ?? null;
}

async function seatUsage(companyId) {
  const [used, total] = await Promise.all([
    User.countDocuments({ companyId, role: "hr", active: true }),
    User.countDocuments({ companyId, role: "hr" }),
  ]);
  return { used, total };
}

/** The caller's own company, with plan detail and seat usage. */
export async function getMyCompany(req, res, next) {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });
    const plan = await Plan.findOne({ key: company.plan });
    const seats = await seatUsage(company._id);
    res.json({
      ...company.toJSON(), // `plan` here is the key string ("basic" | ...)
      hrSeatsUsed: seats.used,
      hrCount: seats.total,
      planDetail: plan ? plan.toJSON() : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function listHr(req, res, next) {
  try {
    const hr = await User.find({ companyId: req.user.companyId, role: "hr" }).sort({ createdAt: 1 });
    res.json(hr);
  } catch (err) {
    next(err);
  }
}

export async function createHr(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const company = await Company.findById(req.user.companyId);
    if (!company.plan) {
      return res.status(409).json({ message: "Choose a plan before adding HR accounts." });
    }
    if (company.hrSeatLimit != null) {
      const { used } = await seatUsage(company._id);
      if (used >= company.hrSeatLimit) {
        return res.status(409).json({
          message: `Your ${company.plan} plan allows ${company.hrSeatLimit} HR seats. Upgrade the plan or deactivate an HR to add another.`,
        });
      }
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "hr",
      companyId: company._id,
      active: true,
    });
    await logAudit(req.user.name, "HR added", `${name} <${email}>`, company._id);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateHr(req, res, next) {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      role: "hr",
    });
    if (!user) return res.status(404).json({ message: "HR account not found" });

    const { active, name } = req.body;

    if (active === true && user.active === false) {
      const company = await Company.findById(req.user.companyId);
      if (company.hrSeatLimit != null) {
        const { used } = await seatUsage(company._id);
        if (used >= company.hrSeatLimit) {
          return res
            .status(409)
            .json({ message: `No free HR seats on the ${company.plan} plan.` });
        }
      }
    }

    if (active !== undefined) user.active = Boolean(active);
    if (name !== undefined) user.name = name;
    await user.save();

    await logAudit(
      req.user.name,
      "HR updated",
      `${user.name} — ${user.active ? "active" : "deactivated"}`,
      req.user.companyId,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function changePlan(req, res, next) {
  try {
    const { plan } = req.body;
    if (!["basic", "advance", "custom"].includes(plan)) {
      return res.status(400).json({ message: "plan must be basic, advance or custom" });
    }

    const company = await Company.findById(req.user.companyId);
    const newLimit = await seatLimitForPlan(plan);
    if (newLimit != null) {
      const { used } = await seatUsage(company._id);
      if (used > newLimit) {
        return res.status(409).json({
          message: `The ${plan} plan allows ${newLimit} HR seats but you have ${used} active. Deactivate some first.`,
        });
      }
    }

    const firstPick = !company.plan;
    company.plan = plan;
    company.hrSeatLimit = newLimit;
    if (firstPick || !company.subscriptionExpiresAt) {
      company.subscriptionStartedAt = new Date();
      company.subscriptionExpiresAt = new Date(Date.now() + SUBSCRIPTION_DAYS * DAY);
    }
    await company.save();
    await logAudit(
      req.user.name,
      firstPick ? "Plan selected" : "Plan changed",
      `${company.name} → ${plan}`,
      company._id,
    );
    res.json(company.toJSON());
  } catch (err) {
    next(err);
  }
}
