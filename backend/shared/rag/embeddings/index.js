import { ragConfig } from "../config.js";
import { GeminiEmbeddingClient } from "./gemini.js";
import { LocalEmbeddingClient } from "./local.js";
import { HashingEmbeddingClient } from "./hashing.js";

let cached;

/**
 * The one embedding client, shared by both sides of the pipeline.
 *
 * It must be the same on both: a question embedded by a different model than
 * the documents lands in an unrelated space, and every score is meaningless.
 */
export function embeddingClient() {
  if (cached) return cached;
  const { driver, local, gemini, hashing } = ragConfig.embeddings;

  if (driver === "local") {
    cached = new LocalEmbeddingClient(local);
  } else if (driver === "gemini") {
    cached = new GeminiEmbeddingClient(gemini);
  } else {
    cached = new HashingEmbeddingClient(hashing);
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rag] Running the hashing embedder in production. It has no semantics - " +
          "assistant answers will be no better than keyword search. Set GEMINI_API_KEY.",
      );
    }
  }
  return cached;
}

/** Tests and scripts that switch drivers mid-process. */
export function resetEmbeddingClient() {
  cached = undefined;
}
