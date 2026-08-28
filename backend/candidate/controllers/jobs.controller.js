import Job from "../../shared/models/Job.model.js";
import Company from "../../shared/models/Company.model.js";

/** Bulk map of companyId -> company name for decorating public job listings. */
async function companyNames(jobs) {
  const ids = [...new Set(jobs.map((j) => j.companyId?.toString()).filter(Boolean))];
  const companies = await Company.find({ _id: { $in: ids } }).select("name");
  return Object.fromEntries(companies.map((c) => [c._id.toString(), c.name]));
}

export async function listPublicJobs(req, res, next) {
  try {
    const jobs = await Job.find({
      status: "open",
      publicApplyEnabled: true,
      kind: { $ne: "screening" },
    }).sort({ createdAt: -1 });
    const names = await companyNames(jobs);
    res.json(
      jobs.map((j) => {
        const json = j.toJSON();
        json.companyName = names[json.companyId] ?? null;
        return json;
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getPublicJob(req, res, next) {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      status: "open",
      publicApplyEnabled: true,
      kind: { $ne: "screening" },
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }
    const names = await companyNames([job]);
    const json = job.toJSON();
    json.companyName = names[json.companyId] ?? null;
    res.json(json);
  } catch (err) {
    next(err);
  }
}
