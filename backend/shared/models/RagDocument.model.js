import mongoose from "mongoose";

/** One document in the assistant's knowledge base. */
const ragDocumentSchema = new mongoose.Schema(
  {
    /** cv | job | application | policy | profile */
    sourceType: { type: String, required: true },
    /** Stable identity per source type, e.g. `"<id>#2"`. */
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
    /** Whether this document may name its candidate. */
    identityRevealed: { type: Boolean, default: false },

    /** Vector, packed as float32 to keep documents small. */
    embedding: { type: Buffer, default: null },
    /** Which model made the embedding - mismatches are skipped, not scored. */
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
