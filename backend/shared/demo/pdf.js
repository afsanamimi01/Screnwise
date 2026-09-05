/**
 * A very small PDF writer, used only to give the demo dataset real CV files.
 *
 * The repo already carries a PDF *reader* (`pdf-parse`); adding a writer as a
 * dependency to generate sample data would be a poor trade, so this emits the
 * handful of objects a text-only document needs: catalog, page tree, one
 * content stream per page, and two standard Type1 fonts that every reader has
 * built in (no font embedding, no compression, no images).
 *
 * The output is deliberately plain, because it has to survive the round trip
 * back through `pdf-parse` - the same reader the screening engine uses.
 */

const PAGE = { width: 595, height: 842, margin: 56 };
const LEADING = 14;
const LINES_PER_PAGE = Math.floor((PAGE.height - PAGE.margin * 2) / LEADING);

/** Characters that would otherwise terminate or escape a PDF string literal. */
function escapeText(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    // The base fonts are Latin-1; anything outside it would render as noise.
    .replace(/[^\x20-\x7E]/g, "-");
}

/**
 * One line of the document.
 * @typedef {{ text: string, bold?: boolean, size?: number, gap?: number }} Line
 */

function contentStream(lines) {
  const parts = ["BT", `1 0 0 1 ${PAGE.margin} ${PAGE.height - PAGE.margin} Tm`, `${LEADING} TL`];
  let pending = 0;

  for (const line of lines) {
    // A blank line is expressed as extra leading rather than an empty draw.
    for (let i = 0; i < (line.gap ?? 0); i++) pending++;
    const font = line.bold ? "/F2" : "/F1";
    const size = line.size ?? 10;
    parts.push(`${font} ${size} Tf`);
    for (let i = 0; i <= pending; i++) parts.push("T*");
    pending = 0;
    parts.push(`(${escapeText(line.text)}) Tj`);
  }

  parts.push("ET");
  return parts.join("\n");
}

/** Split the lines into pages, counting the blank-line gaps against the page. */
function paginate(lines) {
  const pages = [];
  let current = [];
  let used = 0;

  for (const line of lines) {
    const cost = 1 + (line.gap ?? 0);
    if (used + cost > LINES_PER_PAGE && current.length) {
      pages.push(current);
      current = [];
      used = 0;
      // A gap at the top of a fresh page just wastes space.
      line = { ...line, gap: 0 };
    }
    current.push(line);
    used += cost;
  }
  if (current.length) pages.push(current);
  return pages.length ? pages : [[{ text: "" }]];
}

/**
 * Render lines to a PDF document.
 *
 * @param {Line[]} lines
 * @returns {Buffer}
 */
export function renderPdf(lines) {
  const pages = paginate(lines);

  // Object numbering: 1 catalog, 2 page tree, 3..(2+n) pages,
  // then one content stream per page, then the two fonts.
  const pageIds = pages.map((_, i) => 3 + i);
  const contentIds = pages.map((_, i) => 3 + pages.length + i);
  const fontRegularId = 3 + pages.length * 2;
  const fontBoldId = fontRegularId + 1;

  const objects = [];
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] =
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  pages.forEach((pageLines, i) => {
    objects[pageIds[i]] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
      `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
      `/Contents ${contentIds[i]} 0 R >>`;

    const stream = contentStream(pageLines);
    objects[contentIds[i]] =
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontRegularId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objects[fontBoldId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  // Assemble, recording each object's byte offset for the xref table.
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = Buffer.byteLength(pdf, "latin1");
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  const count = objects.length; // entries 0..n-1, with 0 being the free head
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
