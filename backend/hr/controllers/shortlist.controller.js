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

export async function shortlistCandidates(req, res, next) {
  try {
    // ---- Step 1: only applications that belong to the caller's company ----
    const { applicationIds = [] } = req.body;
    const apps = await Application.find({ _id: { $in: applicationIds } }).populate("jobId");

    const companyId = req.user.companyId?.toString();
    const allowed = [];
    for (const a of apps) {
      if (a.jobId?.companyId?.toString() === companyId) allowed.push(a);
    }

    // ---- Step 2: move them to "shortlisted" ----
    const allowedIds = [];
    for (const a of allowed) allowedIds.push(a._id);
    await Application.updateMany({ _id: { $in: allowedIds } }, { $set: { status: "shortlisted" } });

    // ---- Step 3: re-index and log ----
    if (allowed.length) {
      // Shortlisting changes who these documents describe, not what they say,
      // so their hashes move and the affected ones are re-indexed. The CV text
      // itself stays redacted - a name is read from the shortlist page, never
      // from the knowledge base.
      for (const app of allowed) rag.application(app._id);

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
 * Undo a shortlist: back to "screened", so the candidate returns to the blind
 * rank board and drops off this shortlist page. HR-only, same as shortlisting
 * itself - see `hr/routes/shortlist.routes.js`.
 */
export async function unshortlistCandidates(req, res, next) {
  try {
    // ---- Step 1: only applications that belong to the caller's company ----
    const { applicationIds = [] } = req.body;
    const apps = await Application.find({ _id: { $in: applicationIds } }).populate("jobId");

    const companyId = req.user.companyId?.toString();
    const allowed = [];
    for (const a of apps) {
      if (a.jobId?.companyId?.toString() === companyId) allowed.push(a);
    }

    // ---- Step 2: move them back to "screened" ----
    const allowedIds = [];
    for (const a of allowed) allowedIds.push(a._id);
    await Application.updateMany({ _id: { $in: allowedIds } }, { $set: { status: "screened" } });

    // ---- Step 3: re-index and log, same as a shortlist does ----
    if (allowed.length) {
      // Reversing a shortlist hides the identity these documents describe
      // again, so the affected ones are re-indexed - same reasoning as
      // shortlisting itself.
      for (const app of allowed) rag.application(app._id);

      const jobTitle = allowed[0].jobId?.title ?? "a job";
      await logAudit(
        req.user.name,
        "Candidate unshortlisted",
        `${allowed.length} candidate(s) on ${jobTitle}`,
        req.user.companyId,
      );
    }

    res.json({ unshortlisted: allowed.length });
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
