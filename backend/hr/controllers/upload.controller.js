import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";
import { screenCv } from "../../shared/engine/index.js";

/** Turn "jordan-blake-cv-final.pdf" into "Jordan Blake" for the (blind) record. */
function nameFromFileName(fileName, index) {
  const base = fileName.replace(/\.[^.]+$/, "");
  const words = base
    .split(/[-_\s.]+/)
    .filter((w) => w && !/^(cv|resume|résumé|final|latest|updated|v\d+|\d{4})$/i.test(w));
  if (!words.length) return `Uploaded Candidate ${index + 1}`;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

/**
 * The file name is a fallback, not a source of truth: a dataset drop is named
 * `10554236.pdf` and a real one `jordan-blake-cv.pdf`. Digits-only or
 * single-word results are not a person's name, so the CV's own header wins.
 */
function looksLikeAPersonsName(value) {
  return /\s/.test(value.trim()) && !/\d/.test(value);
}

/**
 * Bulk CV upload for one job / screening batch.
 *
 * Each file is parsed and scored inline by the local screening engine
 * (`shared/engine`) - no external API. For very large drops this runs long;
 * moving it onto a queue is the documented next step (docs/screening-engine.md).
 */
export async function uploadCvs(req, res, next) {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "Attach one or more PDF, DOCX or TXT files (field name: cvs)" });
    }

    const existingCount = await Application.countDocuments({ jobId });
    const docs = [];
    let unreadableCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await screenCv(
        { buffer: file.buffer, fileName: file.originalname, mimeType: file.mimetype },
        job,
      );
      if (result.score === 0 && result.scoreBreakdown[0]?.dimension === "File") unreadableCount++;

      // Identity comes from the CV itself. An address is never invented: with
      // none printed in the file the record keeps an empty one and the email
      // composer refuses to write to that candidate, rather than sending a
      // real message to a plausible-looking address that nobody reads.
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
      });
    }

    const created = await Application.insertMany(docs);

    await logAudit(
      req.user.name,
      "CVs uploaded",
      `${files.length} file${files.length === 1 ? "" : "s"} to ${job.title}` +
        (unreadableCount ? ` · ${unreadableCount} unreadable` : ""),
      req.user.companyId,
    );

    // The rank board is blind - strip identity before returning.
    const blind = created.map((a) => {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      return json;
    });
    res.status(201).json(blind);
  } catch (err) {
    next(err);
  }
}
