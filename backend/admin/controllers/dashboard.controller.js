import Company from "../../shared/models/Company.model.js";
import User from "../../shared/models/User.model.js";
import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";

const DAY = 24 * 60 * 60 * 1000;


export async function getAdminDashboard(req, res, next) {
  try {
    // Companies
    const companiesCount = await Company.countDocuments();

    // Active now
    // "accessible" is a virtual on the model, so it needs hydrated documents.
    const companiesForActive = await Company.find();
    const activeCompaniesCount = companiesForActive.filter((c) => c.accessible).length;

    // Candidates
    const candidatesCount = await User.countDocuments({ role: "candidate" });

    // Jobs
    const jobsCount = await Job.countDocuments();

    // Applications
    const applicationsCount = await Application.countDocuments();

    // Expiring soon
    const soon = new Date(Date.now() + 7 * DAY);
    const companiesForExpiry = await Company.find();
    const expiringSoon = companiesForExpiry
      .filter(
        (c) =>
          c.status === "active" &&
          c.plan &&
          c.subscriptionExpiresAt &&
          c.subscriptionExpiresAt <= soon,
      )
      .map((c) => ({
        id: c.id,
        name: c.name,
        plan: c.plan,
        status: c.status,
        subscriptionExpiresAt: c.toJSON().subscriptionExpiresAt,
      }));

    // Recent companies
    const recentCompaniesList = await Company.find().sort({ createdAt: "desc" }).limit(6);
    const recentCompanies = recentCompaniesList.map((c) => ({
      id: c.id,
      name: c.name,
      plan: c.plan,
      status: c.status,
      accessible: c.accessible,
      subscriptionExpiresAt: c.toJSON().subscriptionExpiresAt,
    }));

   
    const companiesForPlanMix = await Company.find();
    const planMix = companiesForPlanMix.reduce((acc, c) => {
      const key = c.plan ?? "none";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      totals: {
        companies: companiesCount,
        activeCompanies: activeCompaniesCount,
        candidates: candidatesCount,
        jobs: jobsCount,
        applications: applicationsCount,
      },
      planMix,
      expiringSoon,
      recentCompanies,
    });
  } catch (err) {
    next(err);
  }
}
