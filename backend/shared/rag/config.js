/**
 * Assistant and retrieval settings, all env-driven so none of them need a code
 * change to move.
 */
const bool = (value, fallback) =>
  value === undefined ? fallback : !["0", "false", "no", ""].includes(String(value).toLowerCase());

export const ragConfig = {
  /**
   * Whether a write re-indexes what it touched. On in the app, off in scripts
   * that bulk-load fixtures so a seed does not embed itself line by line.
   */
  autoReindex: bool(process.env.RAG_AUTO_REINDEX, true),

  embeddings: {
    /**
     * local   - runs here, no API. The default, and the recommended one:
     *           CV text is other people's personal data and should not be
     *           posted to a third party to be vectorised.
     * gemini  - hosted API. Stronger model, but every CV goes over the wire
     *           and the free tier's quota makes indexing slow.
     * hashing - deterministic, offline, no model at all. Tests only: it has
     *           no semantics, which is the entire point of retrieval here,
     *           so it is never a silent fallback.
     */
    driver: process.env.RAG_EMBEDDING_DRIVER || "local",
    local: {
      /**
       * Runs on this server - no API, no rate limit, and candidate CV text
       * never leaves the machine. The default for that last reason above all.
       * ~90 MB, downloaded once and cached, CPU only.
       */
      model: process.env.RAG_LOCAL_MODEL || "Xenova/all-MiniLM-L6-v2",
      dimensions: Number(process.env.RAG_LOCAL_DIMENSIONS || 384),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
      /**
       * These models are Matryoshka - 3072 is the full width, and a shorter
       * prefix is a usable vector at a fraction of the size. 768 is Google's
       * recommended step down, and retrieval reads every candidate's vector on
       * every question, so the width is bandwidth as much as it is accuracy.
       */
      dimensions: Number(process.env.RAG_DIMENSIONS || 768),
    },
    hashing: { dimensions: Number(process.env.RAG_HASHING_DIMENSIONS || 256) },
  },

  retrieval: {
    /**
     * hybrid  - vector similarity fused with keyword scoring (recommended)
     * vector  - embeddings only
     * lexical - keywords only, no embedding provider needed at all
     *
     * The single-method modes exist so the value of fusion can be measured
     * rather than assumed: run the same questions through each.
     */
    mode: process.env.RAG_RETRIEVAL_MODE || "hybrid",
    /**
     * How many documents become context. Small on purpose - more context is
     * not more accuracy, and every extra passage is tokens paid for.
     */
    topK: Number(process.env.RAG_TOP_K || 6),
    /**
     * Cosine below this is "no match", not "the closest thing I have". Weak
     * context is exactly what a model over-trusts. Vector half only; the
     * keyword half self-limits, since a document sharing no query term scores
     * nothing at all.
     */
    minScore: Number(process.env.RAG_MIN_SCORE || 0.15),
    /**
     * Reciprocal rank fusion constant. Fusing by POSITION rather than score is
     * the point: cosine and BM25 live on different scales, and weighting them
     * directly needs recalibrating whenever either side changes. 60 is the
     * value the original paper settled on and it is not sensitive.
     */
    rrfK: Number(process.env.RAG_RRF_K || 60),
    /** Hard ceiling on candidates pulled into memory for scoring. */
    maxCandidates: Number(process.env.RAG_MAX_CANDIDATES || 4000),
  },

  ingestion: {
    /** CV and policy prose split at this size; row-documents are never split. */
    chunkChars: Number(process.env.RAG_CHUNK_CHARS || 1200),
    chunkOverlap: Number(process.env.RAG_CHUNK_OVERLAP || 150),
  },

  chat: {
    model: process.env.GEMINI_CHAT_MODEL || "gemini-flash-latest",
    apiKey: process.env.GEMINI_API_KEY || "",
    maxToolRounds: Number(process.env.RAG_MAX_TOOL_ROUNDS || 4),
    temperature: Number(process.env.RAG_TEMPERATURE || 0.2),
  },
};
