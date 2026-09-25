import Application from "../../shared/models/Application.model.js";
import Job from "../../shared/models/Job.model.js";

/** Every application this candidate submitted, newest first, each with its job. */
export async function listMyApplications(req, res, next) {
  try {
    
    const applications = await Application.find({ candidateId: req.user._id }).sort({
      appliedAt: "desc",
    });

    // ---- Step 2: the jobs they applied to, fetched independently ----
    const jobIds = [...new Set(applications.map((a) => String(a.jobId)))];
    const jobs = await Job.find({ _id: { $in: jobIds } });
    const jobById = new Map(jobs.map((j) => [String(j._id), j.toJSON()]));

    // ---- Step 3: pair each application with its job (or null if it was removed) ----
    const rows = applications.map((a) => {
      const job = jobById.get(String(a.jobId)) ?? null;
      const app = a.toJSON();
      app.jobId = job ? job.id : String(a.jobId ?? "");
      return { app, job };
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
}
