/**
 * Vectors on the wire and in the database.
 *
 * Stored as packed float32 rather than an array of BSON doubles - half the
 * bytes, none of the per-element key overhead, and retrieval reads every
 * candidate's vector on every question.
 */

/** @param {number[]} values @returns {Buffer} */
export function packVector(values) {
  const floats = Float32Array.from(values);
  return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
}

/**
 * Stored bytes back into a vector.
 *
 * The input is not always a Node `Buffer`. A `.lean()` query - which retrieval
 * uses, because it reads hundreds of documents per question - hands back the
 * raw BSON `Binary` wrapper instead, and that object is a trap: its `length` is
 * a *method*, so a `!buffer?.length` guard sees a truthy function and waves it
 * through, and `Buffer.from(binary)` then yields nothing. The result is a
 * vector of zero floats, a cosine of 0 for every document, and a vector half
 * that is silently dead while every test that does not measure it still passes.
 *
 * So the shape is normalised explicitly rather than assumed.
 *
 * @param {Buffer|{buffer: Buffer}|null} stored
 * @returns {Float32Array|null}
 */
export function unpackVector(stored) {
  if (!stored) return null;

  // BSON Binary exposes the bytes at `.buffer`; a Node Buffer is already one.
  const bytes = Buffer.isBuffer(stored)
    ? stored
    : Buffer.isBuffer(stored.buffer)
      ? stored.buffer
      : ArrayBuffer.isView(stored)
        ? Buffer.from(stored.buffer, stored.byteOffset, stored.byteLength)
        : null;

  if (!bytes || bytes.length < 4) return null;

  // Copy rather than view: Mongo hands back slices of a larger pooled buffer,
  // and a misaligned byteOffset makes the Float32Array constructor throw.
  const copy = Buffer.from(bytes);
  return new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
}

/**
 * Scale to unit length so a dot product IS the cosine similarity.
 *
 * Done at embed time, once per document, instead of dividing by magnitudes on
 * every comparison. It also repairs Matryoshka truncation: a 3072-dimension
 * model output is unit length, but the first 768 of those numbers are not, and
 * comparing un-normalised truncations quietly skews every score.
 *
 * @param {number[]|Float32Array} values
 * @returns {number[]}
 */
export function normalizeVector(values) {
  let magnitude = 0;
  for (const value of values) magnitude += value * value;
  magnitude = Math.sqrt(magnitude);
  if (magnitude <= 0) return Array.from(values);
  return Array.from(values, (value) => value / magnitude);
}

/**
 * Cosine similarity of two unit vectors - a plain dot product.
 * Length mismatch means two different models, which scores 0 rather than
 * throwing: the caller filters those out, this is the backstop.
 */
export function dot(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
