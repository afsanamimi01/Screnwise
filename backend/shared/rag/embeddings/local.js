import { pipeline } from "@huggingface/transformers";

/**
 * Embeddings computed on this server, with no API and no network.
 *
 * This is the recommended driver for Screenwise, and the reason is not cost.
 * CV text is the personal data of people who are not the customer, and a hosted
 * embedding API means every candidate's résumé is sent to a third party to be
 * vectorised - on a free tier, one that reserves the right to train on it.
 * Running the model here removes that question rather than paying to opt out of
 * it.
 *
 * The practical wins came out the same way. Indexing is not rate limited, so a
 * full rebuild is seconds rather than the eight minutes of quota backoff a
 * hosted key costs, and a 200-CV upload re-indexes immediately instead of
 * queueing behind a per-minute window.
 *
 * Measured against `gemini-embedding-2` on this corpus, query "who has
 * leadership experience" over five passages:
 *
 *   MiniLM   spread 0.367, unrelated control at -0.034
 *   Gemini   spread 0.122, unrelated control at  0.499
 *
 * The spread is what matters. Gemini's cosines sit in a narrow band near 0.5
 * even for text sharing nothing with the query, which makes a similarity floor
 * meaningless - every document clears it. MiniLM pushes unrelated content to
 * zero and below, so `RAG_MIN_SCORE` can actually reject something. Fusion
 * ranks by position either way, but "nothing matched" only registers as such
 * when non-matches score like non-matches.
 *
 * The model is ~90 MB, downloaded once to the Hugging Face cache on first use
 * and loaded from disk after. It runs on CPU; no GPU is involved.
 */

/**
 * `bge-*` models document a query-side instruction prefix. It was measured here
 * and it made separation WORSE (spread 0.291 -> 0.268), exactly as a prefix did
 * on Gemini. Both sides are embedded as plain text.
 */
let extractor;
let loading;

export class LocalEmbeddingClient {
  constructor({ model = "Xenova/all-MiniLM-L6-v2", dimensions = 384 } = {}) {
    this.modelId = model;
    this.dimensions = dimensions;
  }

  get model() {
    return `local:${this.modelId}@${this.dimensions}`;
  }

  get semantic() {
    return true;
  }

  /**
   * The pipeline is loaded once per process and shared. Loading takes several
   * seconds and allocates the weights, so building one per call would make
   * every batch pay for it.
   */
  async pipeline() {
    if (extractor) return extractor;
    // Concurrent callers during startup must await the same load rather than
    // each starting their own - two loads means twice the memory for nothing.
    loading ??= pipeline("feature-extraction", this.modelId, { dtype: "fp32" });
    extractor = await loading;
    return extractor;
  }

  /**
   * @param {string[]} texts
   * @returns {Promise<number[][]>} unit-length vectors, one per input, in order
   */
  async embed(texts) {
    if (!texts.length) return [];
    const extract = await this.pipeline();

    const out = [];
    // Chunked so a 700-document index does not build one enormous tensor.
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE).map(clean);
      // `normalize: true` returns unit vectors, so a dot product IS the cosine
      // and the retriever never divides by magnitudes.
      const tensor = await extract(batch, { pooling: "mean", normalize: true });
      out.push(...tensor.tolist());
      if (this.onProgress) this.onProgress(Math.min(i + BATCH_SIZE, texts.length), texts.length);
    }
    return out;
  }

  async embedOne(text) {
    const [vector] = await this.embed([text]);
    return vector;
  }
}

/** Texts per forward pass. Bounded by memory, not by any quota. */
const BATCH_SIZE = Number(process.env.RAG_LOCAL_BATCH || 32);

/**
 * The model has a 512-token window and silently truncates past it. Chunks are
 * already sized well under that, but a pathological document should not be
 * allowed to blow up the tensor - and empty strings make the pooler produce
 * NaN, which then poisons every comparison it touches.
 */
function clean(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed ? trimmed.slice(0, 4000) : "(empty)";
}
