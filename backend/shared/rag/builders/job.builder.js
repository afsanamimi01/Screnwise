import Job from "../../models/Job.model.js";
import { DocumentDraft } from "../draft.js";

/**
 * Job posts, rendered as prose rather than dumped as fields.
 *
 * A row printed as `requiredSkills: ["Node.js","AWS"]` embeds badly - the
 * vector model has to work out that a JSON fragment describes a role. Written
 * as a sentence, it lands near the questions people actually ask about it.
 *
 * These serve both sides of the product: an HR user asking what a role requires,
 * and a candidate asking which open roles suit them. The second is why
 * `publicRead` exists - an open, publicly-applyable post is readable by any
 * signed-in candidate, while a `kind: "screening"` batch never leaves its tenant.
 */
export const jobBuilder = {
  sourceType: "job",

  async build(filter = {}) {
    const jobs = await Job.find(filter).lean();

    return jobs.map((job) => {
      const lines = [
        `${job.title} at a company on Screenwise.`,
        job.department && `Department: ${job.department}.`,
        job.location && `Location: ${job.location}.`,
        job.employmentType && `Employment type: ${job.employmentType}.`,
        job.description && `\n${job.description}\n`,
        job.requiredSkills?.length && `Required skills: ${job.requiredSkills.join(", ")}.`,
        job.niceToHaveSkills?.length && `Nice to have: ${job.niceToHaveSkills.join(", ")}.`,
        job.minYears ? `Minimum experience: ${job.minYears} years.` : "No minimum years of experience.",
        job.educationLevel && job.educationLevel !== "Any" && `Education required: ${job.educationLevel}.`,
        job.certifications?.length && `Certifications: ${job.certifications.join(", ")}.`,
        // The weights are how this role is actually scored, so a question about
        // why someone ranked where they did can be answered from the post.
        job.weights &&
          `Scoring weights out of 100 - skills ${job.weights.skills}, experience ` +
            `${job.weights.experience}, education ${job.weights.education}, ` +
            `certifications ${job.weights.certifications}, keyword fit ${job.weights.keywords}.`,
        job.hardFilters?.mustHaveSkills?.length &&
          `Must-have skills (missing one costs 15 points): ${job.hardFilters.mustHaveSkills.join(", ")}.`,
        job.hardFilters?.workPermitRequired && "A work-eligibility statement is required.",
        `Status: ${job.status}. ${job.publicApplyEnabled ? "Open to public applications." : "Not accepting public applications."}`,
      ].filter(Boolean);

      return new DocumentDraft({
        sourceType: "job",
        sourceId: String(job._id),
        title: `Job post: ${job.title}`,
        content: lines.join("\n"),
        companyId: job.companyId,
        jobId: job._id,
        visibleToRole: "all",
        // An internal screening batch is never public, whatever its status.
        publicRead: job.kind !== "screening" && job.status === "open" && !!job.publicApplyEnabled,
      });
    });
  },
};
