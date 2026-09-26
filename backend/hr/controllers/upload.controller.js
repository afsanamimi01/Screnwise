import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { rag } from "../../shared/rag/indexer.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";
import { screenCv } from "../../shared/engine/index.js";
import { screeningStatus } from "../../shared/billing/subscription.js";

/** Turn "jordan-blake-cv-final.pdf" into "Jordan Blake" for the (blind) record. */
function nameFromFileName(fileName, index) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const words = base
    .split(/[-_\s.]+/)
    .filter((w) => w && !/^(cv|resume|résumé|final|latest|updated|v\d+|\d{4})$/i.test(w));
  if (!words.length) return `Uploaded Candidate ${index + 1}`;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/** File name is a fallback, not the source of truth. */
function looksLikeAPersonsName(value) {
  return /\s/.test(value.trim()) && !/\d/.test(value);
}

/** Bulk CV upload for one job/batch. */
export async function uploadCvs(req, res, next) {
  try {
    // Find job
    const { jobId } = req.params;

    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Require files
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Attach one or more PDF, DOCX or TXT files (field name: cvs)" });
    }

    // Count files
    let fileCount = 0;
    for (const file of files) {
      fileCount = fileCount + 1;
    }

    // Check limit
    const { limit, used, remaining } = await screeningStatus(req.company);
    if (limit != null && fileCount > remaining) {
      return res.status(409).json({
        code: "SCREENING_LIMIT_REACHED",
        message:
          remaining > 0
            ? `Your ${req.company.plan} plan allows ${limit} CV screenings a month. You've used ${used} and have ${remaining} left - upload ${remaining} file${remaining === 1 ? "" : "s"} or fewer, or upgrade the plan.`
            : `Your ${req.company.plan} plan's monthly CV screening limit (${limit}) is used up. Upgrade the plan to screen more this month.`,
      });
    }

    // Screen files
    const existingCount = await Application.countDocuments({ jobId });
    const docs = [];
    let unreadableCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await screenCv(
        { buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype },
        job,
      );
      if (result.score === 0 && result.scoreBreakdown[0]?.dimension === "File") {
        unreadableCount = unreadableCount + 1;
      }

      // Identity from CV only, never invented.
      const contact = result.contact ?? { email: "", phone: "", name: "" };
      const fromFileName = nameFromFileName(file.originalname, existingCount + i);
      const name =
        contact.name ||
        (looksLikeAPersonsName(fromFileName)
          ? fromFileName
          : `Uploaded Candidate ${existingCount + i + 1}`);

      docs.push({
        jobId: job._id,
        name,
        email: contact.email,
        phone: contact.phone,
        alias: `Candidate #${String(existingCount + i + 1).padStart(3, "0")}`,
        source: "HR-uploaded",
        score: result.score,
        scoreBreakdown: result.scoreBreakdown,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        yearsExperience: result.yearsExperience,
        currentTitle: result.currentTitle,
        pastTitles: result.pastTitles,
        educationLevel: result.educationLevel,
        needsManualReview: result.needsManualReview,
        status: result.status,
        appliedAt: new Date(),
        cvFileName: file.originalname,
        cvText: result.text ?? "",
      });
    }

    // Save batch
    const created = await Application.insertMany(docs);

    // Re-index batch, fire-and-forget.
    rag.jobApplications(job._id);

    await logAudit(
      req.user.name,
      "CVs uploaded",
      `${fileCount} file${fileCount === 1 ? "" : "s"} to ${job.title}` +
        (unreadableCount ? ` · ${unreadableCount} unreadable` : ""),
      req.user.companyId,
    );

    // Strip identity
    const blind = [];
    for (const a of created) {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      blind.push(json);
    }

    res.status(201).json(blind);
  } catch (err) {
    next(err);
  }
}
