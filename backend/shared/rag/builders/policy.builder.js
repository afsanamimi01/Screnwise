import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentDraft } from "../draft.js";
import { chunkText } from "../chunk.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** backend/shared/rag/builders -> repository root */
const ROOT = path.resolve(HERE, "..", "..", "..", "..");

/**
 * Product documentation - how Screenwise itself works.
 *
 * The smallest corpus and the least glamorous, but it answers the questions
 * support actually receives: what the blind board is, why a hard filter costs
 * 15 points rather than rejecting someone, what a seat limit means, why a
 * scanned CV scores zero. Four roles with different powers and a plan gate make
 * this genuinely confusing, and none of it is derivable from a database row.
 *
 * Source is the repository's own `docs/`, so the answers cannot drift from the
 * documentation the team maintains - there is no second copy to update.
 *
 * Platform-wide: no `companyId`, visible to every role.
 */
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
