import { normalizeVector } from "../vector.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Task instructions for gemini-embedding-2 vs -001. */

/** Texts per batch call, paced under the free tier quota. */
const BATCH_SIZE = Number(process.env.RAG_EMBED_BATCH || 25);
/** Pause between batches. Free tier needs it; a paid key can set this to 0. */
const PACE_MS = Number(process.env.RAG_EMBED_PACE_MS || 1500);
const MAX_RETRIES = Number(process.env.RAG_EMBED_RETRIES || 6);
/** Long enough to clear a per-minute quota window. */
const MAX_BACKOFF_MS = 70000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Google returns its requested wait in the error body. */
function retryDelayFrom(body) {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body ?? "");
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

/** Google's Gemini embedding API. */
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

      // Free tier quota is expected - back off using Google's requested wait.
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

  /** Send a batch, probing the dimensionality field shape. */
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
