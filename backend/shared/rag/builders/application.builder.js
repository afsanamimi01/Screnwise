import Application from "../../models/Application.model.js";
import Job from "../../models/Job.model.js";
import { DocumentDraft } from "../draft.js";

/**
 * An application's own score, written out as the explanation it already is.
 *
 * The engine emits human-readable notes per dimension ("Matched 6 of 8 required
 * skills: React, TypeScript...") and today they stop at the recruiter. This
 * document is what lets a candidate ask why they scored what they did and what
 * would move it - the free tier's reason to come back.
 *
 * It is pinned to the candidate AND to the company, which the visibility filter
 * handles without special-casing: the company clause matches on `companyId`,
 * the candidate clause on `visibleToUserId`, and one document can satisfy
 * either. HR-uploaded rows have no account behind them, so they carry no
 * `visibleToUserId` and stay company-only.
 *
 * Never split - a score is one fact, and half a breakdown is a misleading one.
 */
export const applicationBuilder = {
  sourceType: "application",

  async build(filter = {}) {
    const applications = await Application.find(filter).lean();
    if (!applications.length) return [];

    const jobIds = [...new Set(applications.map((a) => String(a.jobId)))];
    const jobs = await Job.find({ _id: { $in: jobIds } })
      .select("title companyId requiredSkills minYears educationLevel")
      .lean();
    const jobById = new Map(jobs.map((j) => [String(j._id), j]));

    const drafts = [];

    for (const app of applications) {
      const job = jobById.get(String(app.jobId));
      if (!job) continue;

      const alias = app.alias || "This candidate";
      const lines = [
        `${alias} applied to "${job.title}" on ${new Date(app.appliedAt).toISOString().slice(0, 10)}` +
          ` and scored ${app.score} out of 100. Current status: ${app.status}.`,
        "",
        "How that score was reached, dimension by dimension:",
        ...(app.scoreBreakdown ?? []).map(
          (d) => `- ${d.dimension}: ${d.scored} of ${d.weight} points. ${d.note ?? ""}`.trim(),
        ),
        "",
        app.matchedSkills?.length
          ? `Skills found in the CV: ${app.matchedSkills.join(", ")}.`
          : "No required skills were found in the CV.",
        app.missingSkills?.length
          ? `Required skills NOT found: ${app.missingSkills.join(", ")}. ` +
            "Adding demonstrable evidence of these is what would raise the skills score most."
          : "Every required skill was found.",
        `Estimated experience: ${app.yearsExperience} years against a ${job.minYears}-year requirement.`,
        `Education detected: ${app.educationLevel}. The role asks for: ${job.educationLevel}.`,
        app.currentTitle && `Most recent title read from the CV: ${app.currentTitle}.`,
      ].filter(Boolean);

      drafts.push(
        new DocumentDraft({
          sourceType: "application",
          sourceId: String(app._id),
          title: `Score breakdown: ${alias} for ${job.title}`,
          content: lines.join("\n"),
          companyId: job.companyId,
          jobId: app.jobId,
          visibleToUserId: app.candidateId ?? null,
          visibleToRole: "all",
          identityRevealed: app.status === "shortlisted",
        }),
      );
    }

    return drafts;
  },
};
