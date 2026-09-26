/** Assistant and retrieval settings, env-driven. */
const bool = (value, fallback) =>
  value === undefined ? fallback : !["0", "false", "no", ""].includes(String(value).toLowerCase());

export const ragConfig = {
  /** Whether a write re-indexes what it touched. */
  autoReindex: bool(process.env.RAG_AUTO_REINDEX, true),

  embeddings: {
    /** Embedding driver: local, gemini, or hashing (tests). */
    driver: process.env.RAG_EMBEDDING_DRIVER || "local",
    local: {
      /** Runs locally - no API, CV text never leaves the machine. */
      model: process.env.RAG_LOCAL_MODEL || "Xenova/all-MiniLM-L6-v2",
      dimensions: Number(process.env.RAG_LOCAL_DIMENSIONS || 384),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || "",
      model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
      /** Matryoshka model - shorter prefix is still usable. */
      dimensions: Number(process.env.RAG_DIMENSIONS || 768),
    },
    hashing: { dimensions: Number(process.env.RAG_HASHING_DIMENSIONS || 256) },
  },

  retrieval: {
    /** Retrieval mode: hybrid, vector, or lexical. */
    mode: process.env.RAG_RETRIEVAL_MODE || "hybrid",
    /** How many documents become context. */
    topK: Number(process.env.RAG_TOP_K || 6),
    /** Cosine floor - below this is "no match". */
    minScore: Number(process.env.RAG_MIN_SCORE || 0.15),
    /** Reciprocal rank fusion constant. */
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
