import { tokenize } from "../../engine/text.js";

/**
 * BM25 keyword scoring - the lexical half of hybrid retrieval.
 *
 * It exists to cover what embeddings are worst at. A vector model generalises
 * ("REST services" ~ "API development") but blurs exact tokens, so a question
 * naming a specific framework, a certification code or a company name can rank
 * below a vaguely related passage. Keyword scoring is the opposite: useless at
 * paraphrase, excellent at exactly those. On a CV corpus that matters more than
 * usual - half of recruiting vocabulary is proper nouns.
 *
 * Computed in Node rather than in a Mongo text index. The candidate set is
 * already scoped to one job's pile before scoring, so there is nothing an index
 * would buy, and one implementation means what runs in development is what runs
 * in production.
 *
 * Tokenising is `engine/text.js`'s, so the assistant splits words exactly the
 * way the screening engine does - "node.js" and "c++" survive both.
 */

/** Term-frequency saturation: how fast repeats stop adding value. */
const K1 = 1.4;
/** How hard longer documents are penalised. */
const B = 0.75;
/** Shorter than this and prefix matching is noise, not stemming. */
const MIN_PREFIX = 4;

/**
 * Interrogatives, dropped on top of the engine's stopword list.
 *
 * They are absent there because the screening engine only ever tokenises CVs
 * and job descriptions, which do not ask questions - and that list is left
 * exactly as it is, because widening it would move every screening score in
 * the product. This overlay applies to retrieval only.
 */
const QUESTION_WORDS = new Set(
  ("who whom whose what which when where why how whether any anyone anybody " +
   "someone somebody show tell find list give me please could would there here")
    .split(" "),
);

/** @param {string} text @returns {string[]} */
function terms(text) {
  return tokenize(text).filter((token) => !QUESTION_WORDS.has(token));
}

/**
 * How strongly one query term is present in one document. An exact token counts
 * in full; a token sharing a long prefix counts half - a cheap stand-in for a
 * stemmer that lets "manage" find "management" and "manager", which is the
 * exact miss that motivates hybrid retrieval on CVs.
 *
 * @param {string} term
 * @param {Map<string, number>} counts
 */
function frequencyOf(term, counts) {
  let frequency = counts.get(term) ?? 0;
  if (term.length < MIN_PREFIX) return frequency;

  for (const [token, count] of counts) {
    if (token === term || token.length < MIN_PREFIX) continue;
    // Either direction: "lead" should find "leadership", and "leadership"
    // should find "lead".
    if (token.startsWith(term) || term.startsWith(token)) frequency += 0.5 * count;
  }
  return frequency;
}

/**
 * Score every document against the query.
 *
 * @param {string} query
 * @param {Array<{ id: string, text: string }>} documents
 * @returns {Map<string, number>} id -> score, unscored documents omitted
 */
export function bm25(query, documents) {
  const queryTerms = [...new Set(terms(query))];
  const scores = new Map();
  if (!queryTerms.length || !documents.length) return scores;

  // Token counts per document, built once and reused for every term.
  const counts = new Map();
  const lengths = new Map();
  for (const doc of documents) {
    const tokens = terms(doc.text);
    const tally = new Map();
    for (const token of tokens) tally.set(token, (tally.get(token) ?? 0) + 1);
    counts.set(doc.id, tally);
    lengths.set(doc.id, Math.max(tokens.length, 1));
  }

  const averageLength = [...lengths.values()].reduce((a, b) => a + b, 0) / lengths.size;

  // Term frequency per document, and in how many documents each term appears
  // at all - the latter is what makes a rare word count more.
  const frequencies = new Map();
  const documentFrequency = new Map();

  for (const term of queryTerms) {
    documentFrequency.set(term, 0);
    for (const [id, tally] of counts) {
      const frequency = frequencyOf(term, tally);
      if (frequency > 0) {
        if (!frequencies.has(id)) frequencies.set(id, new Map());
        frequencies.get(id).set(term, frequency);
        documentFrequency.set(term, documentFrequency.get(term) + 1);
      }
    }
  }

  const total = documents.length;

  for (const [id, terms] of frequencies) {
    let score = 0;
    for (const [term, frequency] of terms) {
      const df = documentFrequency.get(term);
      // Standard BM25 IDF. A term in almost every document adds almost
      // nothing; a term in one document adds a lot.
      const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
      const length = lengths.get(id);
      score +=
        idf *
        ((frequency * (K1 + 1)) /
          (frequency + K1 * (1 - B + B * (length / averageLength))));
    }
    if (score > 0) scores.set(id, score);
  }

  return scores;
}
