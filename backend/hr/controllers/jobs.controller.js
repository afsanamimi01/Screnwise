import Job from "../../shared/models/Job.model.js";
import { logAudit } from "../../shared/utils/audit.js";

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

export async function listJobs(req, res, next) {
  try {
    const filter = req.user.role === "admin" ? {} : { createdBy: req.user._id };
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

export async function createJob(req, res, next) {
  try {
    const job = await Job.create({
      ...pickEditableFields(req.body),
      createdBy: req.user._id,
    });
    await logAudit(req.user.name, "Job created", job.title);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
}

export async function getJobById(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function updateJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the job's creator can edit it" });
    }
    Object.assign(job, pickEditableFields(req.body));
    await job.save();
    await logAudit(req.user.name, "Job updated", job.title);
    res.json(job);
  } catch (err) {
    next(err);
  }
}
