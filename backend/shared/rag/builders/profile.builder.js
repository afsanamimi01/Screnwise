import Candidate from "../../models/Candidate.model.js";
import User from "../../models/User.model.js";
import { DocumentDraft } from "../draft.js";

/**
 * A candidate's own profile.
 *
 * Pinned to the account and nothing else - it is never company-scoped, because
 * a profile is not an application. What a recruiter may see of a candidate is
 * the CV that candidate actually submitted to their job, and that is the `cv`
 * builder's business.
 *
 * Its use is the other direction: it gives the assistant something to reason
 * about the person from when they ask which open roles suit them, without
 * having to re-read their CV file on every question.
 */
export const profileBuilder = {
  sourceType: "profile",

  async build(filter = {}) {
    const profiles = await Candidate.find(filter).lean();
    if (!profiles.length) return [];

    const users = await User.find({ _id: { $in: profiles.map((p) => p.userId) } })
      .select("name role active")
      .lean();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    return profiles
      .filter((profile) => userById.get(String(profile.userId))?.active)
      .map((profile) => {
        const lines = [
          `Profile for ${userById.get(String(profile.userId)).name}.`,
          profile.headline && `Headline: ${profile.headline}.`,
          profile.location && `Location: ${profile.location}.`,
          profile.yearsExperience ? `Years of experience: ${profile.yearsExperience}.` : null,
          profile.educationLevel && `Education: ${profile.educationLevel}.`,
          profile.skills?.length && `Skills: ${profile.skills.join(", ")}.`,
          profile.summary && `\nSummary:\n${profile.summary}`,
          profile.cv?.fileName ? "A CV is attached to this profile." : "No CV on the profile yet.",
        ].filter(Boolean);

        return new DocumentDraft({
          sourceType: "profile",
          sourceId: String(profile._id),
          title: "Your Screenwise profile",
          content: lines.join("\n"),
          companyId: null,
          visibleToUserId: profile.userId,
          visibleToRole: "candidate",
        });
      });
  },
};
