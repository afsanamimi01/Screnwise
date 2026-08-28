import Application from "../../shared/models/Application.model.js";

/** Every application this candidate submitted, newest first, each with its job. */
export async function listMyApplications(req, res, next) {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .sort({ appliedAt: -1 })
      .populate("jobId");

    const rows = applications.map((a) => {
      const jobDoc = a.jobId && a.jobId._id ? a.jobId : null;
      const job = jobDoc ? jobDoc.toJSON() : null;
      const app = a.toJSON();
      app.jobId = job ? job.id : String(a.jobId ?? "");
      return { app, job };
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
}
