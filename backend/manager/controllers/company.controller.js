import bcrypt from "bcryptjs";
import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import Plan from "../../shared/models/Plan.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import {
  PLAN_KEYS,
  activatePlan,
  screeningStatus,
  seatConflict,
  seatLimitForPlan,
  seatUsage,
} from "../../shared/billing/subscription.js";
import { activeDriver } from "../../shared/payment/sslcommerz.js";

/** The caller's own company, with plan detail and seat usage. */
export async function getMyCompany(req, res, next) {
  try {
    // ---- Step 1: the company itself ----
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ---- Step 2: its priced plan, seat usage and screening usage, fetched independently ----
    const plan = await Plan.findOne({ key: company.plan });
    const seats = await seatUsage(company._id);
    const screening = await screeningStatus(company);

    // ---- Step 3: combine them into one response ----
    res.json({
      ...company.toJSON(), // `plan` here is the key string ("basic" | ...)
      hrSeatsUsed: seats.used,
      hrCount: seats.total,
      cvScreeningUsed: screening.used,
      cvScreeningRemaining: screening.remaining,
      planDetail: plan ? plan.toJSON() : null,
    });
  } catch (err) {
    next(err);
  }
}

/** Every HR account on the caller's company, oldest first. */
export async function listHr(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "createdAt desc" to show the newest HR first - nothing else to touch.
    const SORT_BY = "createdAt asc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const hr = await User.find({ companyId: req.user.companyId, role: "hr" }).sort({
      [sortField]: sortOrder,
    });
    res.json(hr);
  } catch (err) {
    next(err);
  }
}

export async function createHr(req, res, next) {
  try {
    // ---- Step 1: the request must name a new HR account in full ----
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    // ---- Step 2: the company must have a plan with a free seat ----
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

    // ---- Step 3: the email must not already belong to someone ----
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // ---- Step 4: create the account and log it ----
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
    // ---- Step 1: the HR account, scoped to the caller's own company ----
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      role: "hr",
    });
    if (!user) return res.status(404).json({ message: "HR account not found" });

    const { active, name } = req.body;

    // ---- Step 2: re-activating needs a free seat; deactivating never does ----
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

    // ---- Step 3: apply the change and log it ----
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
    // ---- Step 1: the plan must be one of the three real plan keys ----
    const { plan } = req.body;
    if (!PLAN_KEYS.includes(plan)) {
      return res.status(400).json({ message: "plan must be basic, advance or custom" });
    }

    // ---- Step 2: a paid plan must go through checkout instead, if a gateway is live ----
    const priced = await Plan.findOne({ key: plan });
    if (activeDriver() !== "manual" && (priced?.amount ?? 0) > 0) {
      return res.status(402).json({
        message: "This plan is paid for at checkout. Start a payment instead.",
        code: "PAYMENT_REQUIRED",
      });
    }

    // ---- Step 3: the switch must not leave the company over its new seat limit ----
    const company = await Company.findById(req.user.companyId);
    const conflict = await seatConflict(company._id, plan);
    if (conflict) return res.status(409).json({ message: conflict });

    // ---- Step 4: activate it and log whether this was a first pick or a change ----
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
