import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/** Rank board is blind: identity fields are stripped until a candidate is shortlisted. */
export async function getBoard(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "score asc" to show the lowest scores first - nothing else to touch.
    const SORT_BY = "score desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // ---- Step 1: this job, scoped to the caller's company ----
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // ---- Step 2: its applications, blind - identity stays hidden until shortlisted ----
    const apps = await Application.find({ jobId }).sort({ [sortField]: sortOrder });
    const blind = [];
    for (const a of apps) {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      blind.push(json);
    }

    res.json(blind);
  } catch (err) {
    next(err);
  }
}
