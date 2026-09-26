import Job from "../../shared/models/Job.model.js";
import Company from "../../shared/models/Company.model.js";

/** Bulk map of companyId -> company name for decorating public job listings. */
async function companyNames(jobs) {
  const ids = [...new Set(jobs.map((j) => j.companyId?.toString()).filter(Boolean))];
  const companies = await Company.find({ _id: { $in: ids } }).select("name");
  return Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]));
}

/** Every open, publicly-applyable job, newest first, each with its company name. */
export async function listPublicJobs(req, res, next) {
  try {
    // Fetch open jobs
    const jobs = await Job.find({
      status: "open",
      publicApplyEnabled: true,
      kind: { $ne: "screening" },
    }).sort({ createdAt: "desc" });

    // Fetch companies
    const names = await companyNames(jobs);

    // Attach company name
    const rows = jobs.map((j) => {
      const json = j.toJSON();
      json.companyName = names[json.companyId] ?? null;
      return json;
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/** One open, publicly-applyable job, with its company name. */
export async function getPublicJob(req, res, next) {
  try {
    // Find job
    const job = await Job.findOne({
      _id: req.params.id,
      status: "open",
      publicApplyEnabled: true,
      kind: { $ne: "screening" },
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }

    // Fetch company
    const names = await companyNames([job]);

    // Attach company name
    const json = job.toJSON();
    json.companyName = names[json.companyId] ?? null;

    res.json(json);
  } catch (err) {
    next(err);
  }
}
