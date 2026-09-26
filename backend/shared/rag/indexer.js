import RagDocument from "../models/RagDocument.model.js";
import { embeddingClient } from "./embeddings/index.js";
import { packVector } from "./vector.js";
import { builders, builderByType } from "./builders/index.js";
import { ragConfig } from "./config.js";

/** Ingestion: sources -> documents -> vectors -> knowledge base. */

/** Documents embedded per API call. */
const EMBED_BATCH = 64;
/** Documents written per bulk call. */
const WRITE_BATCH = 200;

/** Embed a set of drafts and upsert them. */
export async function embedAndStore(drafts) {
  if (!drafts.length) return 0;
  const client = embeddingClient();
  let written = 0;

  for (let i = 0; i < drafts.length; i += EMBED_BATCH) {
    const batch = drafts.slice(i, i + EMBED_BATCH);
    const vectors = await client.embed(batch.map((d) => d.embedText));

    const operations = batch.map((draft, index) => {
      const vector = vectors[index];
      return {
        updateOne: {
          filter: { sourceType: draft.sourceType, sourceId: draft.sourceId },
          update: {
            $set: {
              title: draft.title,
              content: draft.content,
              companyId: draft.companyId,
              jobId: draft.jobId,
              visibleToUserId: draft.visibleToUserId,
              visibleToRole: draft.visibleToRole,
              publicRead: draft.publicRead,
              identityRevealed: draft.identityRevealed,
              embedding: vector?.length ? packVector(vector) : null,
              embeddingModel: vector?.length ? client.model : null,
              dimensions: vector?.length ?? null,
              contentHash: draft.hash(),
              indexedAt: new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    for (let j = 0; j < operations.length; j += WRITE_BATCH) {
      await RagDocument.bulkWrite(operations.slice(j, j + WRITE_BATCH), { ordered: false });
    }
    written += batch.length;
  }

  return written;
}

/** Bring one source's documents in line with its builder. */
export async function syncSource(builder, { filter = {}, scope = null, force = false } = {}) {
  const drafts = await builder.build(filter);
  const ownership = scope ?? { sourceType: builder.sourceType };

  // One query for what is already indexed, so the per-document check below is
  // a map lookup rather than a round trip each time.
  const existing = await RagDocument.find(ownership)
    .select("sourceId contentHash embeddingModel embedding")
    .lean();
  const current = new Map(existing.map((d) => [d.sourceId, d]));
  const model = embeddingClient().model;

  const seen = new Set();
  const stale = [];
  let unchanged = 0;

  for (const draft of drafts) {
    seen.add(draft.sourceId);
    const stored = current.get(draft.sourceId);
    // Unchanged text is not enough on its own: a document embedded by a
    // different model has to be redone, or it sits in the store unusable.
    if (
      !force &&
      stored &&
      stored.contentHash === draft.hash() &&
      stored.embeddingModel === model &&
      stored.embedding
    ) {
      unchanged++;
      continue;
    }
    stale.push(draft);
  }

  const written = await embedAndStore(stale);

  // Documents the builder no longer produces - a deleted job, a CV that got
  // shorter, an application removed.
  const orphans = existing.filter((d) => !seen.has(d.sourceId)).map((d) => d.sourceId);
  let removed = 0;
  if (orphans.length) {
    const result = await RagDocument.deleteMany({ ...ownership, sourceId: { $in: orphans } });
    removed = result.deletedCount ?? 0;
  }

  return { written, unchanged, removed };
}

/** Rebuild the whole knowledge base. */
export async function rebuildAll({ force = false, only = null } = {}) {
  const report = {};
  for (const builder of builders) {
    if (only && !only.includes(builder.sourceType)) continue;
    report[builder.sourceType] = await syncSource(builder, { force });
  }
  return report;
}

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Fire-and-forget re-index used by controllers. */
function background(label, work) {
  if (!ragConfig.autoReindex) return;
  Promise.resolve()
    .then(work)
    .catch((err) => console.warn(`[rag] ${label} re-index failed:`, err.message));
}

/** One application: its score breakdown and its CV passages. */
export async function reindexApplication(applicationId) {
  const id = String(applicationId);
  await syncSource(builderByType.application, {
    filter: { _id: applicationId },
    scope: { sourceType: "application", sourceId: id },
  });
  await syncSource(builderByType.cv, {
    filter: { _id: applicationId },
    // Chunk ids are `<applicationId>#<n>`, so the prefix is this application's
    // documents and no one else's.
    scope: { sourceType: "cv", sourceId: { $regex: `^${escape(id)}#` } },
  });
}

/** Every application on one job - after a bulk upload. */
export async function reindexJobApplications(jobId) {
  await syncSource(builderByType.application, {
    filter: { jobId },
    scope: { sourceType: "application", jobId },
  });
  await syncSource(builderByType.cv, {
    filter: { jobId },
    scope: { sourceType: "cv", jobId },
  });
}

/** One job post. Its applications are untouched - their own documents cover them. */
export async function reindexJob(jobId) {
  await syncSource(builderByType.job, {
    filter: { _id: jobId },
    scope: { sourceType: "job", sourceId: String(jobId) },
  });
}

export async function reindexProfile(userId) {
  await syncSource(builderByType.profile, {
    filter: { userId },
    scope: { sourceType: "profile", visibleToUserId: userId },
  });
}

/** Everything belonging to a job that is going away. */
export async function removeJobDocuments(jobId) {
  await RagDocument.deleteMany({ jobId });
}

export const rag = {
  application: (id) => background("application", () => reindexApplication(id)),
  jobApplications: (id) => background("job applications", () => reindexJobApplications(id)),
  job: (id) => background("job", () => reindexJob(id)),
  profile: (id) => background("profile", () => reindexProfile(id)),
  removeJob: (id) => background("job removal", () => removeJobDocuments(id)),
};
