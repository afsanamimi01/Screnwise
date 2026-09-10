import RagDocument from "../models/RagDocument.model.js";
import { embeddingClient } from "./embeddings/index.js";
import { unpackVector, dot } from "./vector.js";
import { bm25 } from "./scoring/bm25.js";
import { visibleFilter } from "./visibility.js";
import { ragConfig } from "./config.js";

/**
 * The retrieval pipeline: question -> scoped candidates -> two rankings -> top K.
 *
 * The ORDER of those steps is the security model. Visibility is applied in the
 * database first, so scoring only ever runs over documents this caller is
 * already entitled to; another company's CV is not a low-scoring result, it is
 * not a result. Nothing here asks the language model to be discreet.
 *
 * Ranking is hybrid. The question is scored twice - once by vector similarity,
 * once by keyword overlap - and the two rankings are fused. They fail in
 * opposite directions: embeddings generalise but blur exact tokens, keywords
 * nail exact tokens but cannot paraphrase. On a CV corpus that pairing is worth
 * more than usual, because half of recruiting vocabulary is proper nouns
 * ("Kubernetes", "AWS Solutions Architect") sitting next to the paraphrase the
 * screening engine already admits it cannot do ("led a team" ~ "leadership").
 *
 * Both halves run in Node rather than in an index, which follows from the
 * scoping above: after filtering to one job's pile there are a few hundred
 * candidates, and an approximate-nearest-neighbour index earns nothing until
 * that number is in the tens of thousands. Moving to Atlas `$vectorSearch`
 * later means changing this file and nothing else - put the visibility clause
 * in the stage's `filter` field so the pre-filter rule survives the move.
 */

/**
 * @param {object} user      the signed-in user
 * @param {string} question
 * @param {object} [options]
 * @param {string} [options.jobId]         pin to one job's pile
 * @param {string[]} [options.sourceTypes] restrict to certain document kinds
 * @param {number} [options.topK]
 * @returns {Promise<Array<{title: string, content: string, sourceType: string, score: number, vectorScore: number, lexicalScore: number, identityRevealed: boolean}>>}
 */
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

  // Vectors made by a different embedding model sit in an unrelated space, and
  // scoring across them returns confident nonsense. They are skipped rather
  // than compared - which, in hybrid mode, means a model switch degrades to
  // keyword-only retrieval instead of returning nothing until a re-index ends.
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

/**
 * Reciprocal rank fusion: each ranking contributes 1/(k + position) to every
 * document it ranks.
 *
 * Fusing by POSITION rather than by score is the point. Cosine similarity and
 * BM25 live on different scales, and any attempt to weight them directly needs
 * recalibrating every time either side changes. A document both halves like
 * beats one that either half loves - agreement between two methods that fail
 * differently is a strong signal.
 *
 * @param {Array<Map<string, number>>} rankings
 */
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
