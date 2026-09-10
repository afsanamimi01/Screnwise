import Job from "../../models/Job.model.js";
import Application from "../../models/Application.model.js";
import { retrieve } from "../retriever.js";
import { tenantFilter } from "../../middleware/auth.middleware.js";

/**
 * What the assistant is allowed to look up.
 *
 * Every fact in a reply comes back from one of these. The model chooses WHICH
 * lookup to run and how to word the answer; it never supplies the scope. Each
 * tool re-derives that from the signed-in user, so a model that invents a
 * `companyId` - or is talked into one by a candidate's question - still reads
 * only that user's own data.
 *
 * The split matters: `search_knowledge_base` is the semantic half, for
 * questions the schema never anticipated ("who has led a team"). The rest are
 * ordinary scoped queries, because counts, scores and rankings should be
 * computed by the database, not paraphrased out of retrieved passages. Asking a
 * vector search "how many candidates scored above 70" gets a confident guess;
 * asking Mongo gets the number.
 */

/** Applications are ranked blind - identity is never in a tool result. */
const blindRow = (app) => ({
  applicationId: String(app._id),
  candidate: app.alias || "Candidate",
  score: app.score,
  status: app.status,
  yearsExperience: app.yearsExperience,
  currentTitle: app.currentTitle || null,
  educationLevel: app.educationLevel,
  matchedSkills: app.matchedSkills ?? [],
  missingSkills: app.missingSkills ?? [],
  identityAvailable: app.status === "shortlisted",
});

const jobRow = (job) => ({
  jobId: String(job._id),
  title: job.title,
  location: job.location || null,
  employmentType: job.employmentType || null,
  requiredSkills: job.requiredSkills ?? [],
  niceToHaveSkills: job.niceToHaveSkills ?? [],
  minYears: job.minYears,
  educationLevel: job.educationLevel,
  status: job.status,
  openToPublic: !!job.publicApplyEnabled,
});

/** Company-side jobs, or the public board for a candidate. */
async function callerJobs(user) {
  if (user.role === "candidate") {
    return Job.find({ status: "open", publicApplyEnabled: true, kind: { $ne: "screening" } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }
  return Job.find(tenantFilter({ user })).sort({ createdAt: -1 }).limit(100).lean();
}

/** A job the caller is actually entitled to, or null. */
async function scopedJob(user, jobId) {
  if (!jobId) return null;
  const filter =
    user.role === "candidate"
      ? { _id: jobId, status: "open", publicApplyEnabled: true }
      : { _id: jobId, ...tenantFilter({ user }) };
  return Job.findOne(filter).lean().catch(() => null);
}

export const TOOLS = {
  search_knowledge_base: {
    roles: ["hr", "manager", "candidate", "superadmin"],
    declaration: {
      name: "search_knowledge_base",
      description:
        "Semantic search across CV passages, job posts, score breakdowns and Screenwise " +
        "product documentation that the signed-in user is allowed to see. Use this for " +
        "anything about what a CV actually says, how someone's background reads, or how " +
        "the product works - especially wording the job form never captured, like " +
        "'led a team', 'fintech background' or 'worked at a startup'. Not for counting " +
        "or ranking: use get_rank_board for that.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search phrase, in natural language." },
          jobId: {
            type: "string",
            description: "Restrict to one job's candidate pile. Strongly preferred when the user is asking about a specific role.",
          },
          sourceTypes: {
            type: "array",
            items: { type: "string", enum: ["cv", "job", "application", "policy", "profile"] },
            description: "Restrict to certain kinds of document. Use ['policy'] for questions about how Screenwise works.",
          },
        },
        required: ["query"],
      },
    },
    async run(user, args) {
      const job = await scopedJob(user, args.jobId);
      const hits = await retrieve(user, args.query, {
        jobId: job ? String(job._id) : undefined,
        sourceTypes: args.sourceTypes?.length ? args.sourceTypes : undefined,
      });
      if (!hits.length) return { passages: [], note: "Nothing in the knowledge base matched." };
      return {
        passages: hits.map((h) => ({
          title: h.title,
          text: h.content,
          kind: h.sourceType,
          relevance: h.score,
        })),
      };
    },
  },

  list_jobs: {
    roles: ["hr", "manager", "candidate"],
    declaration: {
      name: "list_jobs",
      description:
        "List the jobs available to the user: for a recruiter, every job at their company; " +
        "for a candidate, the open roles they can apply to. Use it to resolve a job named " +
        "in the question into a jobId before calling another tool.",
      parameters: { type: "object", properties: {} },
    },
    async run(user) {
      const jobs = await callerJobs(user);
      return { jobs: jobs.map(jobRow), count: jobs.length };
    },
  },

  get_rank_board: {
    roles: ["hr", "manager"],
    declaration: {
      name: "get_rank_board",
      description:
        "The ranked, BLIND list of candidates screened against one job, highest score " +
        "first, with each one's matched and missing skills. This is the source of truth " +
        "for counts, scores and rankings. Candidates are identified only by an alias " +
        "until they are shortlisted.",
      parameters: {
        type: "object",
        properties: {
          jobId: { type: "string", description: "Which job's board to read." },
          minScore: { type: "number", description: "Only candidates at or above this score." },
          status: {
            type: "string",
            enum: ["applied", "screened", "shortlisted", "rejected"],
            description: "Only candidates with this status.",
          },
          limit: { type: "number", description: "How many rows to return. Default 20, max 100." },
        },
        required: ["jobId"],
      },
    },
    async run(user, args) {
      const job = await scopedJob(user, args.jobId);
      if (!job) return { error: "No such job for this account." };

      const filter = { jobId: job._id };
      if (typeof args.minScore === "number") filter.score = { $gte: args.minScore };
      if (args.status) filter.status = args.status;

      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const [rows, total] = await Promise.all([
        Application.find(filter).sort({ score: -1 }).limit(limit).lean(),
        Application.countDocuments(filter),
      ]);

      return {
        job: job.title,
        matching: total,
        returned: rows.length,
        candidates: rows.map(blindRow),
      };
    },
  },

  get_application: {
    roles: ["hr", "manager", "candidate"],
    declaration: {
      name: "get_application",
      description:
        "One application's full score breakdown - every dimension, the points it earned " +
        "out of its weight, and the engine's note explaining why. Use this to answer " +
        "'why did this score what it did' precisely rather than from a retrieved passage.",
      parameters: {
        type: "object",
        properties: { applicationId: { type: "string" } },
        required: ["applicationId"],
      },
    },
    async run(user, args) {
      const app = await Application.findById(args.applicationId).lean().catch(() => null);
      if (!app) return { error: "No such application." };

      // Scope is re-derived here, never taken from the model: a candidate may
      // read only their own, a recruiter only their company's.
      if (user.role === "candidate") {
        if (String(app.candidateId ?? "") !== String(user._id)) {
          return { error: "No such application." };
        }
      } else {
        const job = await scopedJob(user, app.jobId);
        if (!job) return { error: "No such application." };
      }

      const job = await Job.findById(app.jobId).select("title requiredSkills minYears educationLevel weights").lean();
      return {
        ...blindRow(app),
        job: job?.title ?? null,
        appliedAt: app.appliedAt,
        breakdown: (app.scoreBreakdown ?? []).map((d) => ({
          dimension: d.dimension,
          scored: d.scored,
          outOf: d.weight,
          note: d.note,
        })),
        jobRequires: job
          ? { skills: job.requiredSkills, minYears: job.minYears, education: job.educationLevel }
          : null,
      };
    },
  },

  my_applications: {
    roles: ["candidate"],
    declaration: {
      name: "my_applications",
      description:
        "Every job the signed-in candidate has applied to, with their score and current " +
        "status. Use it before answering anything about their own progress.",
      parameters: { type: "object", properties: {} },
    },
    async run(user) {
      const apps = await Application.find({ candidateId: user._id }).sort({ appliedAt: -1 }).lean();
      if (!apps.length) return { applications: [], note: "This candidate has not applied to anything yet." };

      const jobs = await Job.find({ _id: { $in: apps.map((a) => a.jobId) } })
        .select("title location")
        .lean();
      const jobById = new Map(jobs.map((j) => [String(j._id), j]));

      return {
        applications: apps.map((a) => ({
          applicationId: String(a._id),
          job: jobById.get(String(a.jobId))?.title ?? "a role that has since been removed",
          location: jobById.get(String(a.jobId))?.location ?? null,
          score: a.score,
          status: a.status,
          appliedAt: a.appliedAt,
          missingSkills: a.missingSkills ?? [],
        })),
      };
    },
  },
};

/** The declarations this user's role may call. */
export function declarationsFor(user) {
  return Object.values(TOOLS)
    .filter((tool) => tool.roles.includes(user.role))
    .map((tool) => tool.declaration);
}

/**
 * Run one tool call. A name the role may not call is reported as an error to
 * the model rather than thrown - it must come back as a result, or the
 * conversation is left waiting on an answer that never arrives.
 */
export async function dispatch(name, args, user) {
  const tool = TOOLS[name];
  if (!tool || !tool.roles.includes(user.role)) {
    return { error: `No tool named ${name} is available to this account.` };
  }
  return tool.run(user, args ?? {});
}
