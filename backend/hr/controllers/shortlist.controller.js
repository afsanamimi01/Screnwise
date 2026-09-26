import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";
import { rag } from "../../shared/rag/indexer.js";

/** Identities are revealed only here, once a candidate has been shortlisted. */
export async function getShortlist(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "score asc" to show the lowest scores first - nothing else to touch.
    const SORT_BY = "score desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // Find job
    const { jobId } = req.params;
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Fetch shortlisted
    const apps = await Application.find({
      jobId,
      status: "shortlisted",
    }).sort({ [sortField]: sortOrder });

    // Check CV availability
    const candidateIds = [];
    for (const a of apps) {
      if (a.candidateId) candidateIds.push(a.candidateId);
    }
    const profiles = candidateIds.length
      ? await Candidate.find({ userId: { $in: candidateIds } }).select("userId cv.fileName cv.size")
      : [];
    const cvByUser = new Map();
    for (const p of profiles) cvByUser.set(p.userId.toString(), p.cv);

    // Pair candidates
    const rows = [];
    for (const a of apps) {
      // The submission's own copy wins over the profile: it is the document
      // that produced this score.
      const cv =
        a.cv?.fileName ? a.cv : a.candidateId ? cvByUser.get(a.candidateId.toString()) : null;
      rows.push({
        app: a.toJSON(),
        candidate: {
          id: (a.candidateId ?? a._id).toString(),
          name: a.name,
          email: a.email,
          phone: a.phone || "",
          location: job.location,
          /** The full CV opens only from here - see `getApplicationCv`. */
          cvAvailable: !!cv?.fileName,
          cvFileName: cv?.fileName ?? "",
        },
      });
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function shortlistCandidates(req, res, next) {
  try {
    // Filter allowed
    const { applicationIds = [] } = req.body;
    const apps = await Application.find({ _id: { $in: applicationIds } }).populate("jobId");

    const companyId = req.user.companyId?.toString();
    const allowed = [];
    for (const a of apps) {
      if (a.jobId?.companyId?.toString() === companyId) allowed.push(a);
    }

    // Mark shortlisted
    const allowedIds = [];
    for (const a of allowed) allowedIds.push(a._id);
    await Application.updateMany({ _id: { $in: allowedIds } }, { $set: { status: "shortlisted" } });

    // Count allowed
    let allowedCount = 0;
    for (const a of allowed) {
      allowedCount = allowedCount + 1;
    }

    // Re-index and log
    if (allowedCount > 0) {
      // Re-index since identity changed; CV text stays redacted.
      for (const app of allowed) rag.application(app._id);

      const jobTitle = allowed[0].jobId?.title ?? "a job";
      await logAudit(
        req.user.name,
        "Candidate shortlisted",
        `${allowedCount} candidate(s) on ${jobTitle}`,
        req.user.companyId,
      );
    }

    res.json({ shortlisted: allowedCount });
  } catch (err) {
    next(err);
  }
}

/** Undo a shortlist - back to "screened". */
export async function unshortlistCandidates(req, res, next) {
  try {
    // Filter allowed
    const { applicationIds = [] } = req.body;
    const apps = await Application.find({ _id: { $in: applicationIds } }).populate("jobId");

    const companyId = req.user.companyId?.toString();
    const allowed = [];
    for (const a of apps) {
      if (a.jobId?.companyId?.toString() === companyId) allowed.push(a);
    }

    // Mark screened
    const allowedIds = [];
    for (const a of allowed) allowedIds.push(a._id);
    await Application.updateMany({ _id: { $in: allowedIds } }, { $set: { status: "screened" } });

    // Count allowed
    let allowedCount = 0;
    for (const a of allowed) {
      allowedCount = allowedCount + 1;
    }

    // Re-index and log
    if (allowedCount > 0) {
      // Re-index since identity is hidden again.
      for (const app of allowed) rag.application(app._id);

      const jobTitle = allowed[0].jobId?.title ?? "a job";
      await logAudit(
        req.user.name,
        "Candidate unshortlisted",
        `${allowedCount} candidate(s) on ${jobTitle}`,
        req.user.companyId,
      );
    }

    res.json({ unshortlisted: allowedCount });
  } catch (err) {
    next(err);
  }
}

/** Serve a shortlisted candidate's CV to HR. */
export async function getApplicationCv(req, res, next) {
  try {
    // Find application
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    // The job carries the tenancy - never trust the application alone.
    const job = await Job.findOne({ _id: application.jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Application not found" });

    // Require shortlisted
    if (application.status !== "shortlisted") {
      return res.status(403).json({
        message: "The CV opens once this candidate is shortlisted - screening stays blind until then.",
        code: "NOT_SHORTLISTED",
      });
    }

    // Resolve file
    let cv = application.cv?.data ? application.cv : null;
    if (!cv && application.candidateId) {
      const profile = await Candidate.findOne({ userId: application.candidateId });
      cv = profile?.cv?.data ? profile.cv : null;
    }

    if (!cv) {
      return res.status(404).json({
        message: application.candidateId
          ? "This candidate has no CV on file."
          : "This CV was uploaded by your team and isn't stored - only the parsed result is.",
        code: "CV_NOT_STORED",
      });
    }

    // Log view
    await logAudit(
      req.user.name,
      "CV viewed",
      `${application.name} on ${job.title}`,
      req.user.companyId,
    );

    res.set("Content-Type", cv.contentType || "application/octet-stream");
    res.set("Content-Disposition", `inline; filename="${(cv.fileName || "cv").replace(/"/g, "")}"`);
    res.send(cv.data);
  } catch (err) {
    next(err);
  }
}
