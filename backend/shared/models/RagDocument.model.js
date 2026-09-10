import mongoose from "mongoose";

/**
 * One document in the assistant's knowledge base - a CV passage, a job, an
 * application's own score notes, or a paragraph of product documentation.
 *
 * Visibility is columns, not convention. Retrieval filters on these BEFORE any
 * similarity maths runs, so another company's CV is never a low-ranked result:
 * it is not a candidate at all. A `$match` cannot be talked out of its filter;
 * a sentence in a system prompt can.
 *
 * Three axes, because Screenwise has three separate walls:
 *   companyId        the tenant wall - mirrors `tenantFilter`
 *   jobId            scopes a CV to the pile it was screened into
 *   identityRevealed the blind board - false until the candidate is shortlisted
 */
const ragDocumentSchema = new mongoose.Schema(
  {
    /** cv | job | application | policy | profile */
    sourceType: { type: String, required: true },
    /**
     * Stable identity of the thing this was built from, unique per source type
     * - `"<applicationId>#2"` for the third chunk of a CV. Re-indexing upserts
     * on the pair rather than piling up duplicates.
     */
    sourceId: { type: String, required: true },

    title: { type: String, default: "" },
    content: { type: String, required: true },

    /** Owning tenant. Null for platform-wide material (product docs). */
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    /** The job whose pile this belongs to - the pre-filter for CV search. */
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    /** Pinned to one account: a candidate's own CV, profile or application. */
    visibleToUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** What shared material is scoped to: all | hr | manager | candidate | superadmin */
    visibleToRole: { type: String, default: "all" },
    /** Open, publicly-applyable jobs - readable by any signed-in candidate. */
    publicRead: { type: Boolean, default: false },
    /**
     * Whether this document may name its candidate. Written redacted either
     * way; this only governs whether the *title* carries a name, and lets the
     * assistant know it is allowed to say one.
     */
    identityRevealed: { type: Boolean, default: false },

    /**
     * The vector, packed as float32 rather than a BSON array of doubles: an
     * array costs 8 bytes plus per-element key overhead, and retrieval pulls
     * every candidate's vector over the wire. At 768 dimensions this is the
     * difference between ~3 KB and ~13 KB per document, on every question.
     */
    embedding: { type: Buffer, default: null },
    /**
     * Which model made it. Vectors from two models sit in unrelated spaces and
     * comparing across them returns confident nonsense, so a mismatch is
     * skipped rather than scored - a model switch degrades to keyword-only
     * retrieval instead of going blank until a re-index finishes.
     */
    embeddingModel: { type: String, default: null },
    dimensions: { type: Number, default: null },

    /** Skips re-embedding text that has not moved - what makes re-indexing cheap. */
    contentHash: { type: String, required: true },
    indexedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ragDocumentSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
// The shape of every retrieval query: narrow to what this caller may see,
// then rank what is left.
ragDocumentSchema.index({ companyId: 1, jobId: 1, sourceType: 1 });
ragDocumentSchema.index({ visibleToUserId: 1 });
ragDocumentSchema.index({ publicRead: 1, sourceType: 1 });

export default mongoose.model("RagDocument", ragDocumentSchema);
