import bcrypt from "bcryptjs";
import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import Plan from "../../shared/models/Plan.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import {
  PLAN_KEYS,
  activatePlan,
  seatConflict,
  seatLimitForPlan,
  seatUsage,
} from "../../shared/billing/subscription.js";
import { activeDriver } from "../../shared/payment/sslcommerz.js";

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
      `${user.name} - ${user.active ? "active" : "deactivated"}`,
      req.user.companyId,
    );
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * Switch plan without paying.
 *
 * Only legitimate for the Custom plan (agreed offline) and when no payment
 * gateway is configured at all. With a gateway live, a paid plan has to go
 * through checkout - otherwise this endpoint would be a free upgrade.
 */
export async function changePlan(req, res, next) {
  try {
    const { plan } = req.body;
    if (!PLAN_KEYS.includes(plan)) {
      return res.status(400).json({ message: "plan must be basic, advance or custom" });
    }

    const priced = await Plan.findOne({ key: plan });
    if (activeDriver() !== "manual" && (priced?.amount ?? 0) > 0) {
      return res.status(402).json({
        message: "This plan is paid for at checkout. Start a payment instead.",
        code: "PAYMENT_REQUIRED",
      });
    }

    const company = await Company.findById(req.user.companyId);
    const conflict = await seatConflict(company._id, plan);
    if (conflict) return res.status(409).json({ message: conflict });

    const { firstPick } = await activatePlan(company, plan);
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
