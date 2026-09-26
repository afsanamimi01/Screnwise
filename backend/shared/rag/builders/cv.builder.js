import Application from "../../models/Application.model.js";
import Job from "../../models/Job.model.js";
import { DocumentDraft } from "../draft.js";
import { chunkText } from "../chunk.js";
import { redactCv } from "../redact.js";

/** CV passages - the corpus retrieval exists for. */
export const cvBuilder = {
  sourceType: "cv",

  /** Filter narrows to one job/application; omitted rebuilds all. */
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
            // Heading carries filterable facts into the embedded text.
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
