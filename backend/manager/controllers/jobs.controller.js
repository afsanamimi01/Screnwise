import Job from "../../shared/models/Job.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/**
 * Every job/screening owned by the caller's company (all members share
 * visibility). `?kind=screening` returns the internal screening batches;
 * anything else returns real job postings only.
 *
 * Managers only read jobs here - creating and editing a posting is HR-only,
 * see `hr/controllers/jobs.controller.js`.
 */
export async function listJobs(req, res, next) {
  try {
    const kindFilter =
      req.query.kind === "screening" ? { kind: "screening" } : { kind: { $ne: "screening" } };
    const jobs = await Job.find({ ...tenantFilter(req), ...kindFilter }).sort({ createdAt: -1 });
    res.json(jobs);
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
