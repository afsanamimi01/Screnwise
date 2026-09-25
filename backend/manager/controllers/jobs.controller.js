import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/**
 * Every job/screening owned by the caller's company (all members share
 * visibility), each with its own applicant and shortlisted count attached -
 * computed here so the jobs table doesn't fetch every job's applications
 * itself. `?kind=screening` returns the internal screening batches; anything
 * else returns real job postings only.
 *
 * Managers only read jobs here - creating and editing a posting is HR-only,
 * see `hr/controllers/jobs.controller.js`.
 */
export async function listJobs(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "createdAt asc" to show the oldest jobs first - nothing else to touch.
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // ---- Step 1: this company's jobs (or its screening batches, from ?kind=) ----
    const kindFilter =
      req.query.kind === "screening" ? { kind: "screening" } : { kind: { $ne: "screening" } };
    const jobs = await Job.find({ ...tenantFilter(req), ...kindFilter }).sort({
      [sortField]: sortOrder,
    });

    // ---- Step 2: every application against those jobs, fetched independently ----
    const jobIds = jobs.map((j) => j._id);
    const apps = await Application.find({ jobId: { $in: jobIds } }).select("jobId status");

    // ---- Step 3: attach each job's own applicant and shortlisted count ----
    // One pass per job, counting with plain +1s - nothing fancier needed here.
    const rows = [];
    for (const job of jobs) {
      let applicantCount = 0;
      let shortlistedCount = 0;

      for (const app of apps) {
        if (String(app.jobId) !== String(job._id)) continue;
        applicantCount = applicantCount + 1;
        if (app.status === "shortlisted") shortlistedCount = shortlistedCount + 1;
      }

      rows.push({ ...job.toJSON(), applicantCount, shortlistedCount });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getJobById(req, res, next) {
  try {
    const job = await Job.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
}
