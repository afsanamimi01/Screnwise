import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import User from "../shared/models/User.model.js";
import { retrieve } from "../shared/rag/retriever.js";
import { embeddingClient } from "../shared/rag/embeddings/index.js";
import { ragConfig } from "../shared/rag/config.js";

/** Measure retrieval, rather than assume it. */

const QUESTIONS = {
  hr: [
    { q: "who has led or managed a team", kind: "paraphrase" },
    { q: "candidates with cloud infrastructure background", kind: "paraphrase" },
    { q: "anyone who has worked at a startup", kind: "paraphrase" },
    { q: "who has built REST APIs", kind: "paraphrase" },
    { q: "Kubernetes", kind: "exact" },
    { q: "PostgreSQL", kind: "exact" },
    { q: "what does the blind rank board hide", kind: "policy" },
    { q: "how are hard filters scored", kind: "policy" },
  ],
  candidate: [
    { q: "why did I score what I did", kind: "own-record" },
    { q: "what skills am I missing", kind: "own-record" },
    { q: "which open roles suit a backend developer", kind: "paraphrase" },
    { q: "how does the scoring work", kind: "policy" },
  ],
};

const MODES = ["lexical", "vector", "hybrid"];
const verbose = process.argv.includes("--verbose");

async function main() {
  await connectDB();

  const client = embeddingClient();
  console.log(`embedding: ${client.model}${client.semantic ? "" : "  (LEXICAL ONLY - no semantics)"}`);
  console.log(`top_k=${ragConfig.retrieval.topK} min_score=${ragConfig.retrieval.minScore} rrf_k=${ragConfig.retrieval.rrfK}\n`);

  for (const [role, questions] of Object.entries(QUESTIONS)) {
    const user = await User.findOne({ role, active: true }).lean();
    if (!user) {
      console.log(`(no ${role} in the database - skipped)\n`);
      continue;
    }

    console.log(`=== ${role.toUpperCase()} ===`);
    console.log("kind        question                                   lex  vec  hyb  rescued");

    for (const { q, kind } of questions) {
      const counts = {};
      const tops = {};

      for (const mode of MODES) {
        // The mode is read from config at call time, so it can be swapped
        // between runs without a separate retriever.
        ragConfig.retrieval.mode = mode;
        const hits = await retrieve(user, q);
        counts[mode] = hits.length;
        tops[mode] = hits[0];
      }

      // Did fusion surface something neither single method ranked first?
      const hybridTop = tops.hybrid?.id;
      const rescued =
        hybridTop && hybridTop !== tops.vector?.id && hybridTop !== tops.lexical?.id
          ? "yes"
          : tops.vector?.id && tops.lexical?.id && tops.vector.id !== tops.lexical.id
            ? "differs"
            : "";

      console.log(
        `${kind.padEnd(11)} ${q.slice(0, 42).padEnd(42)} ${String(counts.lexical).padStart(3)} ` +
          `${String(counts.vector).padStart(4)} ${String(counts.hybrid).padStart(4)}  ${rescued}`,
      );

      if (verbose && tops.hybrid) {
        console.log(
          `            -> ${tops.hybrid.title.slice(0, 90)}` +
            `  [v=${tops.hybrid.vectorScore} l=${tops.hybrid.lexicalScore}]`,
        );
      }
    }
    console.log();
  }

  ragConfig.retrieval.mode = process.env.RAG_RETRIEVAL_MODE || "hybrid";

  if (!client.semantic) {
    console.log(
      "The vector column above is keyword matching in disguise: the offline embedder\n" +
        "has no semantics. Set GEMINI_API_KEY and re-index to measure this properly.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
