import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/** Manager shortlist access is read-only. */

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

/** Serve a shortlisted candidate's CV to manager. */
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
