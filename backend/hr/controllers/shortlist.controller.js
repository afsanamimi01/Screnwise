import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/** Identities are revealed only here, once a candidate has been shortlisted. */
export async function getShortlist(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const apps = await Application.find({
      jobId,
      status: "shortlisted",
    }).sort({ score: -1 });
    const rows = apps.map((a) => ({
      app: a.toJSON(),
      candidate: {
        id: (a.candidateId ?? a._id).toString(),
        name: a.name,
        email: a.email,
        phone: a.phone || "",
        location: job.location,
      },
    }));
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function shortlistCandidates(req, res, next) {
  try {
    const { applicationIds = [] } = req.body;
    const apps = await Application.find({ _id: { $in: applicationIds } }).populate("jobId");

    // Only applications whose job belongs to the caller's company.
    const companyId = req.user.companyId?.toString();
    const allowed = apps.filter((a) => a.jobId?.companyId?.toString() === companyId);

    await Application.updateMany(
      { _id: { $in: allowed.map((a) => a._id) } },
      { $set: { status: "shortlisted" } },
    );

    if (allowed.length) {
      const jobTitle = allowed[0].jobId?.title ?? "a job";
      await logAudit(
        req.user.name,
        "Candidate shortlisted",
        `${allowed.length} candidate(s) on ${jobTitle}`,
        req.user.companyId,
      );
    }

    res.json({ shortlisted: allowed.length });
  } catch (err) {
    next(err);
  }
}
