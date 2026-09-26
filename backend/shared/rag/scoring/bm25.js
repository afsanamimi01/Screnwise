import { tokenize } from "../../engine/text.js";

/** BM25 keyword scoring - the lexical half of retrieval. */

/** Term-frequency saturation: how fast repeats stop adding value. */
const K1 = 1.4;
/** How hard longer documents are penalised. */
const B = 0.75;
/** Shorter than this and prefix matching is noise, not stemming. */
const MIN_PREFIX = 4;

/** Interrogatives, dropped on top of the stopword list. */
const QUESTION_WORDS = new Set(
  ("who whom whose what which when where why how whether any anyone anybody " +
   "someone somebody show tell find list give me please could would there here")
    .split(" "),
);

/** @param {string} text @returns {string[]} */
function terms(text) {
  return tokenize(text).filter((token) => !QUESTION_WORDS.has(token));
}

/** How strongly a query term appears in a document. */
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

/** Score every document against the query. */
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
