import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
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

    // A self-applied candidate's CV lives on their profile, so one lookup for
    // the whole page tells us which rows have a file to open. HR-uploaded CVs
    // are parsed in memory and never stored, so those rows have none.
    const candidateIds = apps.map((a) => a.candidateId).filter(Boolean);
    const profiles = candidateIds.length
      ? await Candidate.find({ userId: { $in: candidateIds } }).select("userId cv.fileName cv.size")
      : [];
    const cvByUser = new Map(profiles.map((p) => [p.userId.toString(), p.cv]));

    const rows = apps.map((a) => {
      // The submission's own copy wins over the profile: it is the document
      // that produced this score.
      const cv =
        a.cv?.fileName ? a.cv : a.candidateId ? cvByUser.get(a.candidateId.toString()) : null;
      return {
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
      };
    });
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

/**
 * Serve a shortlisted candidate's own CV to the recruiter who shortlisted them.
 *
 * This is the one place the full document is readable by HR, and the gate is
 * deliberate: screening happens blind, so the file stays sealed until the
 * candidate has been shortlisted on their score alone. Before that, a 403 -
 * not a 404 - because the honest answer is "not yet", not "no such thing".
 *
 * Only self-applied CVs can be served at all: an HR-uploaded file is parsed in
 * memory and never stored, so there is nothing to open. Every view is written
 * to the audit log, like any other access to a candidate's identity.
 */
export async function getApplicationCv(req, res, next) {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    // The job carries the tenancy - never trust the application alone.
    const job = await Job.findOne({ _id: application.jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Application not found" });

    if (application.status !== "shortlisted") {
      return res.status(403).json({
        message: "The CV opens once this candidate is shortlisted - screening stays blind until then.",
        code: "NOT_SHORTLISTED",
      });
    }

    // Prefer the copy attached to this submission; fall back to the CV on the
    // candidate's profile for applications recorded before that was kept.
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
