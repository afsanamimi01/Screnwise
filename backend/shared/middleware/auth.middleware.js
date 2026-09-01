import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import Company from "../models/Company.model.js";

const COMPANY_ROLES = new Set(["manager", "hr"]);

export async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ message: "Account not found or inactive" });
    }

    // Company members are gated on their organisation's subscription. A manager
    // with no plan yet is still let through — so they can go and pick one.
    if (COMPANY_ROLES.has(user.role)) {
      const company = await Company.findById(user.companyId);
      if (!company) {
        return res.status(403).json({ message: "Your account is not attached to a company" });
      }
      if (company.status === "revoked") {
        return res
          .status(403)
          .json({ message: "Your company's access has been revoked. Contact your administrator." });
      }
      if (user.role === "hr" && !company.accessible) {
        return res
          .status(403)
          .json({ message: "Your company's subscription is inactive. Contact your manager." });
      }
      if (user.role === "manager" && company.plan && company.expired) {
        return res.status(403).json({
          message: "Your company's subscription has expired. Contact your administrator to renew it.",
        });
      }
      req.company = company;
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed for this role" });
    }
    next();
  };
}

/**
 * Mongo filter that scopes a company-owned collection to the caller.
 * Company members are pinned to their own company; a super admin sees all.
 */
export function tenantFilter(req, field = "companyId") {
  if (req.user.role === "superadmin") return {};
  return { [field]: req.user.companyId };
}
