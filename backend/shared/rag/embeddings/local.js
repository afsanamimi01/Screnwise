import { pipeline } from "@huggingface/transformers";

/** Embeddings computed locally - no API, no network. */

/** Query-side instruction prefix measured worse here - not used. */
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

  /** Pipeline loaded once per process and shared. */
  async pipeline() {
    if (extractor) return extractor;
    // Concurrent callers during startup must await the same load rather than
    // each starting their own - two loads means twice the memory for nothing.
    loading ??= pipeline("feature-extraction", this.modelId, { dtype: "fp32" });
    extractor = await loading;
    return extractor;
  }

  /** Embed a batch of texts. */
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

/** Model has a 512-token window - truncate to be safe. */
function clean(text) {
  const trimmed = String(text ?? "").trim();
  return trimmed ? trimmed.slice(0, 4000) : "(empty)";
}
