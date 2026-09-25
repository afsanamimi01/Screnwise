import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

/**
 * Manager access to the shortlist is read-only: a manager can see who HR has
 * shortlisted and open their CV, but shortlisting and un-shortlisting are
 * HR-only actions - see `hr/controllers/shortlist.controller.js`.
 */

/** Identities are revealed only here, once a candidate has been shortlisted. */
export async function getShortlist(req, res, next) {
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

    // ---- Step 2: every shortlisted application on it ----
    const apps = await Application.find({
      jobId,
      status: "shortlisted",
    }).sort({ [sortField]: sortOrder });

    // ---- Step 3: which of those candidates have a CV on file, fetched independently ----
    // A self-applied candidate's CV lives on their profile, so one lookup for
    // the whole page tells us which rows have a file to open. HR-uploaded CVs
    // are parsed in memory and never stored, so those rows have none.
    const candidateIds = [];
    for (const a of apps) {
      if (a.candidateId) candidateIds.push(a.candidateId);
    }
    const profiles = candidateIds.length
      ? await Candidate.find({ userId: { $in: candidateIds } }).select("userId cv.fileName cv.size")
      : [];
    const cvByUser = new Map();
    for (const p of profiles) cvByUser.set(p.userId.toString(), p.cv);

    // ---- Step 4: pair each application with its candidate and CV info ----
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

/**
 * Serve a shortlisted candidate's own CV to the manager viewing them.
 *
 * This is the one place the full document is readable, and the gate is
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
    // ---- Step 1: the application, scoped to the caller's company via its job ----
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ message: "Application not found" });

    // The job carries the tenancy - never trust the application alone.
    const job = await Job.findOne({ _id: application.jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Application not found" });

    // ---- Step 2: refuse until this candidate has actually been shortlisted ----
    if (application.status !== "shortlisted") {
      return res.status(403).json({
        message: "The CV opens once this candidate is shortlisted - screening stays blind until then.",
        code: "NOT_SHORTLISTED",
      });
    }

    // ---- Step 3: resolve the file - the submission's own copy first, then the profile's ----
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

    // ---- Step 4: log the view, then send the file ----
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
