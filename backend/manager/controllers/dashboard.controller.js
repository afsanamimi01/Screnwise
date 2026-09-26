import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/** Manager dashboard: KPIs, jobs, chart. */
export async function getDashboard(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "createdAt asc" to show oldest jobs first - nothing else to touch.
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // Fetch jobs
    const jobs = await Job.find({ ...tenantFilter(req), kind: { $ne: "screening" } }).sort({
      [sortField]: sortOrder,
    });

    // Fetch applications
    const jobIds = jobs.map((j) => j._id);
    const apps = await Application.find({ jobId: { $in: jobIds } }).select("jobId status source");

    // KPI cards
    let activeJobs = 0;
    for (const job of jobs) {
      if (job.status === "open") activeJobs = activeJobs + 1;
    }

    let totalApplicants = 0;
    let totalShortlisted = 0;
    for (const app of apps) {
      totalApplicants = totalApplicants + 1;
      if (app.status === "shortlisted") totalShortlisted = totalShortlisted + 1;
    }
    const shortlistRate =
      totalApplicants > 0 ? Math.round((totalShortlisted / totalApplicants) * 100) : 0;

    const kpis = { activeJobs, totalApplicants, shortlistRate };

    // Job list and chart
    const jobRows = [];
    const chart = [];

    for (const job of jobs) {
      let applicantCount = 0;
      let shortlistedCount = 0;
      let selfApplied = 0;
      let hrUploaded = 0;

      for (const app of apps) {
        if (String(app.jobId) !== String(job._id)) continue;
        applicantCount = applicantCount + 1;
        if (app.status === "shortlisted") shortlistedCount = shortlistedCount + 1;
        if (app.source === "self-applied") selfApplied = selfApplied + 1;
        if (app.source === "HR-uploaded") hrUploaded = hrUploaded + 1;
      }

      jobRows.push({ ...job.toJSON(), applicantCount, shortlistedCount });
      chart.push({ name: job.title, selfApplied, hrUploaded });
    }

    res.json({ kpis, jobs: jobRows, chart });
  } catch (err) {
    next(err);
  }
}
