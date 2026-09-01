/**
 * Turn an uploaded file's bytes into plain text.
 *
 *   PDF  → pdf-parse (bundled pdf.js, no native code)
 *   DOCX → mammoth   (raw text, styling discarded)
 *   TXT  → utf-8
 *
 * Anything else, or any failure, comes back as `{ ok: false, reason }` so the
 * caller can flag the candidate for manual review instead of scoring garbage.
 */
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractText({ buffer, fileName = "", mimeType = "" }) {
  const ext = fileName.toLowerCase().includes(".")
    ? fileName.toLowerCase().split(".").pop()
    : "";

  try {
    if (mimeType.includes("pdf") || ext === "pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const { text } = await parser.getText();
        return { ok: true, kind: "pdf", text: text || "" };
      } finally {
        await parser.destroy?.();
      }
    }

    if (mimeType.includes("word") || mimeType.includes("officedocument") || ext === "docx") {
      const { value } = await mammoth.extractRawText({ buffer });
      return { ok: true, kind: "docx", text: value || "" };
    }

    if (ext === "txt" || mimeType.startsWith("text/")) {
      return { ok: true, kind: "txt", text: buffer.toString("utf8") };
    }

    return {
      ok: false,
      text: "",
      reason: `Unsupported file type${ext ? ` (.${ext})` : ""} - upload PDF, DOCX or TXT`,
    };
  } catch (err) {
    return { ok: false, text: "", reason: `Could not read the file (${err.message})` };
  }
}
