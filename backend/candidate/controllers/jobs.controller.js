import Job from "../../shared/models/Job.model.js";

export async function listPublicJobs(req, res, next) {
  try {
    const jobs = await Job.find({ status: "open", publicApplyEnabled: true }).sort({
      createdAt: -1,
    });
    res.json(jobs);
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
    });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
}
