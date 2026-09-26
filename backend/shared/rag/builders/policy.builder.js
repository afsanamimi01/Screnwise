import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentDraft } from "../draft.js";
import { chunkText } from "../chunk.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** backend/shared/rag/builders -> repository root */
const ROOT = path.resolve(HERE, "..", "..", "..", "..");

/** Product documentation - how Screenwise works. */
const SOURCES = [
  { file: "docs/screening-engine.md", title: "How CV screening works" },
  { file: "docs/architecture.md", title: "How Screenwise is put together" },
  { file: "README.md", title: "Screenwise overview" },
  { file: "CONTRIBUTING.md", title: "Running Screenwise locally" },
];

/** Strip fenced code and tables - neither retrieves well, both eat the budget. */
function readable(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^[-:| ]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export const policyBuilder = {
  sourceType: "policy",

  async build() {
    const drafts = [];

    for (const source of SOURCES) {
      let raw;
      try {
        raw = await readFile(path.join(ROOT, source.file), "utf8");
      } catch {
        // A missing doc is not an error worth failing an index over.
        continue;
      }

      chunkText(readable(raw)).forEach((chunk, index) => {
        drafts.push(
          new DocumentDraft({
            sourceType: "policy",
            sourceId: `${source.file}#${index}`,
            title: `${source.title} (part ${index + 1})`,
            content: chunk,
            companyId: null,
            visibleToRole: "all",
          }),
        );
      });
    }

    return drafts;
  },
};

export { SOURCES as POLICY_SOURCES, ROOT as REPO_ROOT };
