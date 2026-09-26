import { ragConfig } from "./config.js";

/** Split long prose into retrievable passages. */
export function chunkText(text, { size = ragConfig.ingestion.chunkChars, overlap = ragConfig.ingestion.chunkOverlap } = {}) {
  const clean = String(text || "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  // Blank-line blocks, and any block that is itself oversized broken on lines.
  const blocks = [];
  for (const block of clean.split(/\n{2,}/)) {
    if (block.length <= size) {
      blocks.push(block);
      continue;
    }
    let buffer = "";
    for (const line of block.split("\n")) {
      if (buffer && buffer.length + line.length + 1 > size) {
        blocks.push(buffer);
        buffer = "";
      }
      // A single line longer than a whole chunk (a CV with no line breaks at
      // all, which pdf extraction does produce) is cut on width as a last resort.
      if (line.length > size) {
        for (let i = 0; i < line.length; i += size) blocks.push(line.slice(i, i + size));
      } else {
        buffer = buffer ? `${buffer}\n${line}` : line;
      }
    }
    if (buffer) blocks.push(buffer);
  }

  const chunks = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length + 2 > size) {
      chunks.push(current);
      // Carry the tail of the previous chunk so a fact spanning the seam is
      // still whole in one of them.
      const tail = current.slice(-overlap);
      const from = tail.search(/[\n.]/);
      current = from === -1 ? "" : tail.slice(from + 1).trim();
    }
    current = current ? `${current}\n\n${block}` : block;
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}
