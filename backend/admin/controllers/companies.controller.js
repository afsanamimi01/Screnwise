import Company from "../../shared/models/Company.model.js";
import User from "../../shared/models/User.model.js";
import Job from "../../shared/models/Job.model.js";
import { logAudit } from "../../shared/utils/audit.js";

const DAY = 24 * 60 * 60 * 1000;
const RENEW_DAYS = 30;


export async function listCompanies(req, res, next) {
  try {
    // Sort config
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const allCompanies = await Company.find().sort({ [sortField]: sortOrder });

    const rows = [];
    for (const company of allCompanies) {
      // Company
      const companyName = company.name;

      // Manager
      const manager = await User.findOne({ companyId: company._id, role: "manager" }).select(
        "name email",
      );
      const managerInfo = manager ? { name: manager.name, email: manager.email } : null;

      // Plan
      const plan = company.plan;

      // HR seats
      const allHr = await User.find({ companyId: company._id, role: "hr" });
      let hrTotal = 0;
      let hrActive = 0;
      for (const hr of allHr) {
        hrTotal = hrTotal + 1;
        if (hr.active) {
          hrActive = hrActive + 1;
        }
      }

      // Jobs
      const allJobs = await Job.find({ companyId: company._id });
      let jobCount = 0;
      for (const job of allJobs) {
        jobCount = jobCount + 1;
      }

      // Expires
      const subscriptionExpiresAt = company.toJSON().subscriptionExpiresAt;

      // Status
      // "status" and "accessible" (a virtual) come straight off the company.
      const status = company.status;
      const accessible = company.accessible;

      rows.push({
        ...company.toJSON(),
        name: companyName,
        manager: managerInfo,
        plan,
        hrSeatsUsed: hrActive,
        hrCount: hrTotal,
        jobCount,
        subscriptionExpiresAt,
        status,
        accessible,
      });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function updateCompanyAccess(req, res, next) {
  try {
    const { action } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found" });

    let auditLabel = "";
    let auditDetail = company.name;

    // Renew
    if (action === "renew") {
      company.status = "active";

      const now = Date.now();
      let renewFrom = now;
      if (company.subscriptionExpiresAt) {
        const currentExpiry = company.subscriptionExpiresAt.getTime();
        if (currentExpiry > now) {
          renewFrom = currentExpiry;
        }
      }
      const newExpiry = renewFrom + RENEW_DAYS * DAY;
      company.subscriptionExpiresAt = new Date(newExpiry);

      if (!company.subscriptionStartedAt) {
        company.subscriptionStartedAt = new Date();
      }

      auditLabel = "Company subscription renewed";
    } else if (action === "clear") {

      company.plan = null;
      company.hrSeatLimit = 0;
      company.cvScreeningLimit = 0;
      company.subscriptionStartedAt = null;
      company.subscriptionExpiresAt = null;
      company.status = "active";

      auditLabel = "Company subscription cleared";
      auditDetail = `${company.name} - back to no plan`;
    } else if (action === "revoke") {
      company.status = "revoked";

      auditLabel = "Company access revoked";
    } else {
      return res.status(400).json({ message: "action must be 'renew', 'revoke' or 'clear'" });
    }

    await company.save();
    await logAudit(req.user.name, auditLabel, auditDetail, company._id);
    res.json(company.toJSON());
  } catch (err) {
    next(err);
  }
}
