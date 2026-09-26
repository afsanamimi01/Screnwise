import RagDocument from "../models/RagDocument.model.js";
import { embeddingClient } from "./embeddings/index.js";
import { unpackVector, dot } from "./vector.js";
import { bm25 } from "./scoring/bm25.js";
import { visibleFilter } from "./visibility.js";
import { ragConfig } from "./config.js";

/** Retrieval pipeline: question -> scoped candidates -> rankings -> top K. */

/** Retrieve top matches for a question. */
export async function retrieve(user, question, options = {}) {
  const query = String(question || "").trim();
  if (!query) return [];

  const { mode, topK, minScore, rrfK, maxCandidates } = ragConfig.retrieval;

  const candidates = await RagDocument.find(
    visibleFilter(user, { jobId: options.jobId, sourceTypes: options.sourceTypes }),
  )
    .select("title content sourceType embedding embeddingModel identityRevealed jobId")
    .limit(maxCandidates)
    .lean();

  if (!candidates.length) return [];

  const vectorScores =
    mode === "lexical" ? new Map() : await vectorRanking(query, candidates, minScore);
  const lexicalScores = mode === "vector" ? new Map() : lexicalRanking(query, candidates);

  if (!vectorScores.size && !lexicalScores.size) return [];

  const fused = fuse([vectorScores, lexicalScores], rrfK);

  return candidates
    .filter((doc) => fused.has(String(doc._id)))
    .map((doc) => {
      const id = String(doc._id);
      return {
        id,
        title: doc.title,
        content: doc.content,
        sourceType: doc.sourceType,
        jobId: doc.jobId ? String(doc.jobId) : null,
        identityRevealed: !!doc.identityRevealed,
        score: round(fused.get(id), 5),
        // Kept on the result so a weak answer can be traced to which half of
        // retrieval found the passage, and so the modes can be compared.
        vectorScore: round(vectorScores.get(id) ?? 0, 4),
        lexicalScore: round(lexicalScores.get(id) ?? 0, 4),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, options.topK ?? topK);
}

async function vectorRanking(query, candidates, minScore) {
  const client = embeddingClient();
  const model = client.model;

  // Skip vectors from a different embedding model.
  const usable = candidates.filter((d) => d.embedding && d.embeddingModel === model);
  const scores = new Map();
  if (!usable.length) return scores;

  const queryVector = await client.embedOne(query);
  if (!queryVector?.length) return scores;
  const q = Float32Array.from(queryVector);

  for (const doc of usable) {
    const vector = unpackVector(doc.embedding);
    const score = dot(q, vector);
    // Below the floor is "no match", not "the closest thing I have" - weak
    // context is exactly what a model over-trusts.
    if (score >= minScore) scores.set(String(doc._id), score);
  }

  return scores;
}

function lexicalRanking(query, candidates) {
  return bm25(
    query,
    candidates.map((d) => ({ id: String(d._id), text: `${d.title} ${d.content}` })),
  );
}

/** Reciprocal rank fusion, by position rather than score. */
function fuse(rankings, k) {
  const fused = new Map();
  for (const ranking of rankings) {
    const ordered = [...ranking.entries()].sort((a, b) => b[1] - a[1]);
    ordered.forEach(([id], index) => {
      fused.set(id, (fused.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return fused;
}

const round = (n, places) => Number(n.toFixed(places));
