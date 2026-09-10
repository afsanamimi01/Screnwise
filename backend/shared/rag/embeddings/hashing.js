import { normalizeVector } from "../vector.js";

/**
 * A deterministic, offline embedder - no API key, no network, the same vector
 * every time for the same text.
 *
 * This is what development and the seed run on. It is a hashing vectoriser over
 * words and character trigrams, not a learned model: it captures LEXICAL
 * overlap ("Kubernetes" matches "Kubernetes") and knows nothing of meaning
 * ("led a team" does not match "leadership").
 *
 * That limit is the point of it being a separate driver rather than a fallback.
 * Screenwise's whole reason for retrieval is the semantic gap the screening
 * engine already documents - running this in production would rebuild a
 * slightly better TF-IDF cosine and fix nothing. It exists so the pipeline can
 * be exercised end to end for free, not so it can be shipped.
 */
export class HashingEmbeddingClient {
  constructor({ dimensions = 256 } = {}) {
    this.dimensions = dimensions;
  }

  get model() {
    return `hashing:v1-${this.dimensions}`;
  }

  /** Semantic-free, so callers can warn rather than quietly under-deliver. */
  get semantic() {
    return false;
  }

  async embedOne(text) {
    return this.vectorise(text);
  }

  async embed(texts) {
    return texts.map((text) => this.vectorise(text));
  }

  vectorise(text) {
    const vector = new Array(this.dimensions).fill(0);
    const words = String(text || "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}+#]+/u)
      .filter(Boolean);

    for (const word of words) {
      this.add(vector, `w:${word}`, 1);
      // Character trigrams give partial credit for near-misses - plurals and
      // the many spellings of the same technology.
      for (let i = 0; i + 3 <= word.length; i++) {
        this.add(vector, `g:${word.slice(i, i + 3)}`, 0.4);
      }
    }

    return normalizeVector(vector);
  }

  add(vector, token, weight) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash >>>= 0;
    // The low bit picks a sign, so unrelated tokens landing in the same bucket
    // are as likely to cancel as to reinforce.
    vector[hash % this.dimensions] += hash & 1 ? weight : -weight;
  }
}
