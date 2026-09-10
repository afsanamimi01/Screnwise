import Application from "../../models/Application.model.js";
import Job from "../../models/Job.model.js";
import { DocumentDraft } from "../draft.js";
import { chunkText } from "../chunk.js";
import { redactCv } from "../redact.js";

/**
 * CV passages - the corpus the whole feature exists for.
 *
 * The screening engine can only match the vocabulary an HR user typed into the
 * job form; these documents are what let the assistant answer the questions the
 * form never anticipated ("who has fintech experience", "anyone who has led a
 * team"). Every passage is redacted before it is stored, so the blind board
 * survives retrieval - see `redact.js` for why that happens here and not at
 * answer time.
 *
 * `cvText` is `select: false` on the model, so it has to be asked for by name.
 */
export const cvBuilder = {
  sourceType: "cv",

  /**
   * @param {object} [filter] narrows to one job or one application for a
   *   targeted re-index; omitted, it rebuilds everything.
   */
  async build(filter = {}) {
    const applications = await Application.find(filter)
      .select("+cvText jobId alias status score currentTitle educationLevel yearsExperience")
      .lean();
    if (!applications.length) return [];

    // One query for the jobs these belong to, rather than one per application.
    const jobIds = [...new Set(applications.map((a) => String(a.jobId)))];
    const jobs = await Job.find({ _id: { $in: jobIds } }).select("title companyId").lean();
    const jobById = new Map(jobs.map((j) => [String(j._id), j]));

    const drafts = [];

    for (const app of applications) {
      const job = jobById.get(String(app.jobId));
      // An application whose job has been deleted has no tenant to be scoped
      // to. Unscoped is not a safe default, so it is simply not indexed.
      if (!job || !app.cvText?.trim()) continue;

      const alias = app.alias || "This candidate";
      const { text } = redactCv(app.cvText, alias);
      const chunks = chunkText(text);

      chunks.forEach((chunk, index) => {
        drafts.push(
          new DocumentDraft({
            sourceType: "cv",
            sourceId: `${app._id}#${index}`,
            // The heading gives an otherwise anonymous passage something to be
            // cited by, and carries the facts a recruiter filters on into the
            // embedded text itself.
            title:
              `${alias} - CV extract ${index + 1} of ${chunks.length}` +
              ` (applied to ${job.title}, score ${app.score}` +
              `${app.currentTitle ? `, ${app.currentTitle}` : ""}` +
              `${app.yearsExperience ? `, ~${app.yearsExperience} yrs` : ""})`,
            content: chunk,
            companyId: job.companyId,
            jobId: app.jobId,
            visibleToRole: "all",
            identityRevealed: app.status === "shortlisted",
          }),
        );
      });
    }

    return drafts;
  },
};
