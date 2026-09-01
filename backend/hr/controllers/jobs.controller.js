import Job from "../../shared/models/Job.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

const EDITABLE_FIELDS = [
  "title",
  "department",
  "location",
  "employmentType",
  "description",
  "requiredSkills",
  "niceToHaveSkills",
  "minYears",
  "educationLevel",
  "certifications",
  "hardFilters",
  "weights",
  "publicApplyEnabled",
  "status",
];

function pickEditableFields(body) {
  const out = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

/**
 * Every job/screening owned by the caller's company (all members share
 * visibility). `?kind=screening` returns the internal screening batches;
 * anything else returns real job postings only.
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

export async function createJob(req, res, next) {
  try {
    const isScreening = req.body.kind === "screening";
    const job = await Job.create({
      ...pickEditableFields(req.body),
      kind: isScreening ? "screening" : "job",
      publicApplyEnabled: isScreening ? false : req.body.publicApplyEnabled,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });
    await logAudit(
      req.user.name,
      isScreening ? "Screening created" : "Job created",
      job.title,
      req.user.companyId,
    );
    res.status(201).json(job);
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

export async function updateJob(req, res, next) {
  try {
    const job = await Job.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });
    Object.assign(job, pickEditableFields(req.body));
    await job.save();
    await logAudit(req.user.name, "Job updated", job.title, req.user.companyId);
    res.json(job);
  } catch (err) {
    next(err);
  }
}
