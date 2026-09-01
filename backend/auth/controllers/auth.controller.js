import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../shared/models/User.model.js";
import Company from "../../shared/models/Company.model.js";
import { logAudit } from "../../shared/utils/audit.js";

function issueToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, companyId: user.companyId?.toString() ?? null },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

/**
 * Returns a blocking message if this company user should not be let in, or
 * `null` if they're fine. HR needs a fully provisioned company; a manager is
 * only blocked when access is revoked or a chosen plan has lapsed (a manager
 * with no plan yet still signs in - to go pick one).
 */
function companyBlockReason(user, company) {
  if (!company) return "Your account is not attached to a company";
  if (company.status === "revoked") {
    return "Your company's access has been revoked. Contact your administrator to renew it.";
  }
  if (user.role === "hr" && !company.accessible) {
    return "Your company's subscription is inactive. Contact your manager.";
  }
  if (user.role === "manager" && company.plan && company.expired) {
    return "Your company's subscription has expired. Contact your administrator to renew it.";
  }
  return null;
}

/** Public self-serve signup. Always creates a `candidate` - never a company user. */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
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
      role: "candidate",
      companyId: null,
      active: true,
    });
    res.status(201).json({ token: issueToken(user), user });
  } catch (err) {
    next(err);
  }
}

/**
 * Organisation signup. Creates a plan-less Company plus its single `manager`
 * account - the manager picks a plan on first sign-in.
 */
export async function registerCompany(req, res, next) {
  try {
    const { companyName, name, email, password } = req.body;
    if (!companyName || !name || !email || !password) {
      return res
        .status(400)
        .json({ message: "companyName, name, email and password are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const company = await Company.create({
      name: companyName,
      plan: null,
      hrSeatLimit: 0,
      status: "active",
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: "manager",
      companyId: company._id,
      active: true,
    });

    await logAudit(name, "Company registered", `${companyName} - awaiting plan selection`, company._id);
    res.status(201).json({ token: issueToken(user), user, company: company.toJSON() });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.active) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role === "manager" || user.role === "hr") {
      const company = await Company.findById(user.companyId);
      const blocked = companyBlockReason(user, company);
      if (blocked) return res.status(403).json({ message: blocked });
    }

    res.json({ token: issueToken(user), user });
  } catch (err) {
    next(err);
  }
}
