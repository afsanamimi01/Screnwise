import Job from "../../shared/models/Job.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { rag } from "../../shared/rag/indexer.js";
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

    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

export async function createJob(req, res, next) {
  try {
    // ---- Step 1: create it, marking a screening batch as never publicly applyable ----
    const isScreening = req.body.kind === "screening";
    const job = await Job.create({
      ...pickEditableFields(req.body),
      kind: isScreening ? "screening" : "job",
      publicApplyEnabled: isScreening ? false : req.body.publicApplyEnabled,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });

    // ---- Step 2: log it and index it for the assistant ----
    await logAudit(
      req.user.name,
      isScreening ? "Screening created" : "Job created",
      job.title,
      req.user.companyId,
    );
    rag.job(job._id);

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
    // ---- Step 1: the job, scoped to the caller's company ----
    const job = await Job.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // ---- Step 2: apply only the editable fields that were actually sent ----
    Object.assign(job, pickEditableFields(req.body));
    await job.save();

    // ---- Step 3: log it and re-index for the assistant ----
    await logAudit(req.user.name, "Job updated", job.title, req.user.companyId);
    // Editing required skills or weights changes what the post means, and the
    // assistant answers "what does this role need" from it.
    rag.job(job._id);

    res.json(job);
  } catch (err) {
    next(err);
  }
}
