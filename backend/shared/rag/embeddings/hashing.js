import { normalizeVector } from "../vector.js";

/** Deterministic, offline embedder - lexical overlap only. */
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
