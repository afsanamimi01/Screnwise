import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/** Rank board is blind: identity fields are stripped until a candidate is shortlisted. */
export async function getBoard(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const apps = await Application.find({ jobId }).sort({ score: -1 });
    const blind = apps.map((a) => {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      return json;
    });
    res.json(blind);
  } catch (err) {
    next(err);
  }
}
