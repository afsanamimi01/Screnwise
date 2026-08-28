import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";

/** Identities are revealed only here, once a candidate has been shortlisted. */
export async function getShortlist(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const apps = await Application.find({
      jobId,
      status: { $in: ["shortlisted", "interview", "hired"] },
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

    const allowed = apps.filter(
      (a) =>
        req.user.role === "admin" || a.jobId?.createdBy?.toString() === req.user._id.toString(),
    );

    await Application.updateMany(
      { _id: { $in: allowed.map((a) => a._id) } },
      { $set: { status: "shortlisted" } },
    );

    if (allowed.length) {
      const jobTitle = allowed[0].jobId?.title ?? "a job";
      await logAudit(req.user.name, "Candidate shortlisted", `${allowed.length} candidate(s) on ${jobTitle}`);
    }

    res.json({ shortlisted: allowed.length });
  } catch (err) {
    next(err);
  }
}
