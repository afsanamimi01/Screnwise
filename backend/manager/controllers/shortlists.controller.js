import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";

/** Statuses a manager reviews — a candidate at any of these was shortlisted first. */
const REVIEW_STATUSES = ["shortlisted", "interview", "hired"];

/**
 * Every job this manager is attached to, each with its shortlisted-and-beyond
 * candidates. Identities are visible here because screening already happened.
 */
export async function listManagerShortlists(req, res, next) {
  try {
    const jobs = await Job.find({ managerIds: req.user._id }).sort({ createdAt: -1 });

    const result = await Promise.all(
      jobs.map(async (job) => {
        const apps = await Application.find({
          jobId: job._id,
          status: { $in: REVIEW_STATUSES },
        }).sort({ score: -1 });

        const entries = apps.map((a) => ({
          app: a.toJSON(),
          candidate: {
            id: (a.candidateId ?? a._id).toString(),
            name: a.name,
            email: a.email,
            phone: a.phone || "",
            location: job.location,
          },
        }));

        return { job: job.toJSON(), entries };
      }),
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function leaveFeedback(req, res, next) {
  try {
    const { jobId, note = "" } = req.body;
    const job = await Job.findOne({ _id: jobId, managerIds: req.user._id });
    if (!job) {
      return res.status(403).json({ message: "You are not attached to this job" });
    }
    await logAudit(
      req.user.name,
      "Feedback left",
      note ? `${job.title}: ${note.slice(0, 140)}` : job.title,
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
