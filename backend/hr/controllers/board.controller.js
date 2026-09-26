import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

const SCORE_THRESHOLD = 50;

export async function getBoard(req, res, next) {
  try {
    
    const SORT_BY = "score desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // Find job
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Fetch applications
    const apps = await Application.find({ jobId }).sort({ [sortField]: sortOrder });

    // Total applicants
    let totalApplicants = 0;
    for (const app of apps) {
      totalApplicants = totalApplicants + 1;
    }

    // Above threshold
    let aboveThreshold = 0;
    for (const app of apps) {
      if (app.score >= SCORE_THRESHOLD) aboveThreshold = aboveThreshold + 1;
    }

    // Shortlisted
    let shortlisted = 0;
    for (const app of apps) {
      if (app.status === "shortlisted") shortlisted = shortlisted + 1;
    }

    // Needs manual review
    let needsManualReview = 0;
    for (const app of apps) {
      if (app.needsManualReview) needsManualReview = needsManualReview + 1;
    }

    const summary = { totalApplicants, aboveThreshold, shortlisted, needsManualReview };

    // Strip identity
    const blind = [];
    for (const a of apps) {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      blind.push(json);
    }

    res.json({ summary, applications: blind });
  } catch (err) {
    next(err);
  }
}
