import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
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

/** Jobs list with applicant counts. */
export async function listJobs(req, res, next) {
  try {
    
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // Fetch jobs
    const kindFilter =
      req.query.kind === "screening" ? { kind: "screening" } : { kind: { $ne: "screening" } };
    const jobs = await Job.find({ ...tenantFilter(req), ...kindFilter }).sort({
      [sortField]: sortOrder,
    });

    // Fetch applications
    const jobIds = jobs.map((j) => j._id);
    const apps = await Application.find({ jobId: { $in: jobIds } }).select("jobId status");

    // Count applicants
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

export async function createJob(req, res, next) {
  try {
    // Create job
    const isScreening = req.body.kind === "screening";
    const job = await Job.create({
      ...pickEditableFields(req.body),
      kind: isScreening ? "screening" : "job",
      publicApplyEnabled: isScreening ? false : req.body.publicApplyEnabled,
      companyId: req.user.companyId,
      createdBy: req.user._id,
    });

    // Log and index
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
    // Find job
    const job = await Job.findOne({ _id: req.params.id, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Apply updates
    Object.assign(job, pickEditableFields(req.body));
    await job.save();

    // Log and reindex
    await logAudit(req.user.name, "Job updated", job.title, req.user.companyId);
    rag.job(job._id);

    res.json(job);
  } catch (err) {
    next(err);
  }
}
