/** Vectors on the wire and in the database. */

/** @param {number[]} values @returns {Buffer} */
export function packVector(values) {
  const floats = Float32Array.from(values);
  return Buffer.from(floats.buffer, floats.byteOffset, floats.byteLength);
}

/** Stored bytes back into a vector. */
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

/** Scale to unit length so dot product equals cosine similarity. */
export function normalizeVector(values) {
  let magnitude = 0;
  for (const value of values) magnitude += value * value;
  magnitude = Math.sqrt(magnitude);
  if (magnitude <= 0) return Array.from(values);
  return Array.from(values, (value) => value / magnitude);
}

/** Cosine similarity of two unit vectors. */
export function dot(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
