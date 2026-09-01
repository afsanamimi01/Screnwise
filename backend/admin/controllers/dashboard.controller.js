import Company from "../../shared/models/Company.model.js";
import User from "../../shared/models/User.model.js";
import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";

const DAY = 24 * 60 * 60 * 1000;

/** Platform-wide snapshot for the super-admin home. */
export async function getAdminDashboard(req, res, next) {
  try {
    const now = Date.now();
    const soon = new Date(now + 7 * DAY);

    const companies = await Company.find().sort({ createdAt: -1 });
    const active = companies.filter((c) => c.accessible);
    const expiringSoon = companies.filter(
      (c) =>
        c.status === "active" &&
        c.plan &&
        c.subscriptionExpiresAt &&
        c.subscriptionExpiresAt <= soon,
    );

    const [candidates, jobs, applications] = await Promise.all([
      User.countDocuments({ role: "candidate" }),
      Job.countDocuments(),
      Application.countDocuments(),
    ]);

    const planMix = companies.reduce((acc, c) => {
      const key = c.plan ?? "none";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      totals: {
        companies: companies.length,
        activeCompanies: active.length,
        candidates,
        jobs,
        applications,
      },
      planMix,
      expiringSoon: expiringSoon.map((c) => ({
        id: c.id,
        name: c.name,
        plan: c.plan,
        status: c.status,
        subscriptionExpiresAt: c.toJSON().subscriptionExpiresAt,
      })),
      recentCompanies: companies.slice(0, 6).map((c) => ({
        id: c.id,
        name: c.name,
        plan: c.plan,
        status: c.status,
        accessible: c.accessible,
        subscriptionExpiresAt: c.toJSON().subscriptionExpiresAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
