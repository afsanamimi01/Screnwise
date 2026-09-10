import { normalizeVector } from "../vector.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Task instructions. `gemini-embedding-2` dropped the `taskType` parameter and
 * takes no instruction parameter at all, and `gemini-embedding-001` still takes
 * `taskType`, so that path is kept for it.
 *
 * What v2 does NOT get is a prepended instruction sentence. That was tried here
 * and measurably made retrieval worse: a fixed ~9-word prefix on every document
 * is a large share of a short CV passage, so every vector is pulled toward the
 * prefix's own direction and the spread between a match and a non-match
 * collapses. Measured on this corpus, "who has leadership experience" against
 * five passages:
 *
 *   without prefix   target 0.621 ... nonsense 0.499   (spread 0.122, correct order)
 *   with prefix      nonsense 0.759 ... target 0.740   (spread 0.076, WRONG order)
 *
 * A control sentence ("the quick brown fox...") ranked first with the prefix
 * and last without it. Both sides are embedded as raw text; `scripts/rag-check.js`
 * keeps that control in place so a regression here is caught before an index.
 */

/**
 * Texts per batch call. A batch appears to count as one request per TEXT
 * against the free tier's per-minute quota, not one per call, so this is kept
 * modest and paced rather than maximised - a smaller batch that succeeds beats
 * a larger one that 429s and has to be repeated.
 */
const BATCH_SIZE = Number(process.env.RAG_EMBED_BATCH || 25);
/** Pause between batches. Free tier needs it; a paid key can set this to 0. */
const PACE_MS = Number(process.env.RAG_EMBED_PACE_MS || 1500);
const MAX_RETRIES = Number(process.env.RAG_EMBED_RETRIES || 6);
/** Long enough to clear a per-minute quota window. */
const MAX_BACKOFF_MS = 70000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Google returns the wait it wants in the error body as a RetryInfo detail
 * (`"retryDelay": "34s"`). Honouring it is far better than guessing, because it
 * is the actual time until the quota window rolls over.
 */
function retryDelayFrom(body) {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body ?? "");
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

/**
 * Google's Gemini embedding API.
 *
 * Two things here are not obvious from the docs:
 *
 * The output dimensionality field has been documented in two shapes - top-level
 * `outputDimensionality` and nested `embedContentConfig` - and Google's JSON
 * parser rejects an unknown field outright rather than ignoring it. Rather than
 * bet on one, the first call tries one shape and falls back to the other, then
 * remembers which worked for the rest of the process.
 *
 * And a truncated vector is not a unit vector. These models are Matryoshka:
 * asking for 768 of 3072 dimensions returns a usable prefix, but its magnitude
 * is no longer 1, and comparing un-normalised truncations skews every score.
 * `normalizeVector` repairs that at embed time.
 */
export class GeminiEmbeddingClient {
  constructor({ apiKey, model = "gemini-embedding-2", dimensions = 768 } = {}) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is required for the gemini embedding driver");
    this.apiKey = apiKey;
    this.modelId = model;
    this.dimensions = dimensions;
    /** null = not yet probed; "flat" | "nested" once one has worked. */
    this.configShape = null;
  }

  get model() {
    return `${this.modelId}@${this.dimensions}`;
  }

  get semantic() {
    return true;
  }

  /** The older model still takes a taskType; the new one takes a prefix. */
  get usesTaskType() {
    return this.modelId.includes("-001");
  }

  requestFor(text, kind, shape) {
    const isQuery = kind === "query";
    const body = {
      model: `models/${this.modelId}`,
      content: { parts: [{ text }] },
    };
    if (this.usesTaskType) {
      body.taskType = isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";
    }
    if (shape === "nested") body.embedContentConfig = { outputDimensionality: this.dimensions };
    else body.outputDimensionality = this.dimensions;
    return body;
  }

  async post(endpoint, body) {
    let delay = 2000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const response = await fetch(`${BASE}/${this.modelId}:${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
      });

      if (response.ok) return response.json();

      const text = await response.text().catch(() => "");

      // The free tier's quota is low enough that indexing a real corpus WILL
      // meet it, so this is a normal path rather than an exceptional one.
      // Backing off far enough is the difference between a slow index and a
      // half-written one - and the window that matters is per MINUTE, so a
      // doubling sequence that tops out in single-digit seconds never clears
      // it. Google returns the wait it wants in the error body; that is used
      // when present and a long ceiling applied when it is not.
      if (response.status === 429 || response.status >= 500) {
        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Gemini embeddings: ${response.status} after ${MAX_RETRIES} retries. ${text.slice(0, 200)}`,
          );
        }
        const wait = Math.min(Math.max(retryDelayFrom(text) ?? delay, 1000), MAX_BACKOFF_MS);
        if (this.onWait) this.onWait(wait, attempt + 1);
        await sleep(wait);
        delay = Math.min(delay * 2, MAX_BACKOFF_MS);
        continue;
      }

      const error = new Error(`Gemini embeddings: ${response.status} ${text.slice(0, 300)}`);
      error.status = response.status;
      error.body = text;
      throw error;
    }
  }

  /**
   * Send a batch, probing the dimensionality field shape on the first call.
   * @param {string[]} texts @param {"document"|"query"} kind
   */
  async send(texts, kind) {
    const shapes = this.configShape ? [this.configShape] : ["flat", "nested"];
    let lastError;

    for (const shape of shapes) {
      try {
        const payload = { requests: texts.map((t) => this.requestFor(t, kind, shape)) };
        const json = await this.post("batchEmbedContents", payload);
        this.configShape = shape;
        return (json.embeddings ?? []).map((e) => normalizeVector(e.values ?? []));
      } catch (err) {
        // Only a rejected-field 400 is worth trying the other shape for.
        const unknownField = err.status === 400 && /unknown name|invalid json|outputdimensionality/i.test(err.body ?? "");
        if (!unknownField) throw err;
        lastError = err;
      }
    }
    throw lastError;
  }

  async embedOne(text) {
    const [vector] = await this.send([text], "query");
    return vector;
  }

  /** @param {string[]} texts @returns {Promise<number[][]>} */
  async embed(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      if (i > 0 && PACE_MS) await sleep(PACE_MS);
      out.push(...(await this.send(texts.slice(i, i + BATCH_SIZE), "document")));
      if (this.onProgress) this.onProgress(Math.min(i + BATCH_SIZE, texts.length), texts.length);
    }
    return out;
  }
}
