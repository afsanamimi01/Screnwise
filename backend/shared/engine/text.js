/**
 * Dependency-free text helpers for the screening engine: normalisation,
 * tokenising, a small stopword list, Levenshtein distance and a TF-IDF cosine
 * similarity.
 *
 * Everything here is plain arithmetic on purpose - any number the engine
 * produces can be traced back to this file, with no model or API in the loop.
 */

const STOPWORDS = new Set(
  (
    "a an the and or but if then else for to of in on at by with without from as is are was were be been being " +
    "this that these those it its i you he she they we me my your our their his her will shall can could would " +
    "should may might must not no yes do does did have has had having about into over under again further once " +
    "more most other some such only own same so than too very just also per via etc using use used work working"
  ).split(/\s+/),
);

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Lowercase, strip accents, reduce punctuation to spaces (keeps + # . - so
 *  "c++", "c#", "node.js" and "front-end" survive tokenising). */
export function normalize(text) {
  return (text || "")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Word tokens with stopwords and single-character noise removed. */
export function tokenize(text) {
  return normalize(text)
    .split(/[\s.]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Classic Levenshtein edit distance - used only for short fuzzy skill matches. */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[n];
}

/** Term-frequency map for one document. */
function termFreq(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/**
 * TF-IDF cosine similarity between two short documents, 0..1.
 *
 * The two documents form their own two-item corpus, so the IDF term simply
 * damps words that appear in both. It is enough to separate "this CV talks
 * about the same things as the job" from "this one does not"; it is not a
 * semantic model and will not equate synonyms.
 */
export function cosineSimilarity(textA, textB) {
  const a = termFreq(tokenize(textA));
  const b = termFreq(tokenize(textB));
  if (!a.size || !b.size) return 0;

  const vocab = new Set([...a.keys(), ...b.keys()]);
  const docFreq = (t) => (a.has(t) ? 1 : 0) + (b.has(t) ? 1 : 0);
  const idf = (t) => Math.log(1 + 2 / docFreq(t));

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const t of vocab) {
    const wa = (a.get(t) || 0) * idf(t);
    const wb = (b.get(t) || 0) * idf(t);
    dot += wa * wb;
    magA += wa * wa;
    magB += wb * wb;
  }
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
