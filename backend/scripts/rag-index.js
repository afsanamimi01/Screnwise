import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import { rebuildAll } from "../shared/rag/indexer.js";
import { embeddingClient } from "../shared/rag/embeddings/index.js";
import { ragConfig } from "../shared/rag/config.js";
import RagDocument from "../shared/models/RagDocument.model.js";

/**
 * Build (or rebuild) the assistant's knowledge base.
 *
 *   node scripts/rag-index.js                 incremental - only what changed
 *   node scripts/rag-index.js --force         re-embed everything
 *   node scripts/rag-index.js --only=cv,job   one or more sources
 *   node scripts/rag-index.js --stats         report what is stored, index nothing
 *
 * Incremental is the default because re-embedding text that has not moved is
 * the main way a free API tier gets exhausted for nothing.
 */
/** Below this many documents the progress line is more noise than help. */
const BATCH_NOISE_FLOOR = 40;

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const value = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

async function stats() {
  const rows = await RagDocument.aggregate([
    {
      $group: {
        _id: "$sourceType",
        documents: { $sum: 1 },
        embedded: { $sum: { $cond: [{ $ifNull: ["$embedding", false] }, 1, 0] } },
        models: { $addToSet: "$embeddingModel" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  if (!rows.length) return console.log("Knowledge base is empty. Run without --stats to build it.");

  console.log("source        documents  embedded  model");
  for (const row of rows) {
    console.log(
      `${row._id.padEnd(13)} ${String(row.documents).padStart(9)} ${String(row.embedded).padStart(9)}  ${row.models.filter(Boolean).join(", ") || "-"}`,
    );
  }
  const total = rows.reduce((sum, r) => sum + r.documents, 0);
  console.log(`\n${total} documents total.`);
}

async function main() {
  await connectDB();

  const client = embeddingClient();
  console.log(
    `Embedding driver: ${ragConfig.embeddings.driver} (${client.model})` +
      (client.semantic ? "" : "  <- lexical only, no semantic matching"),
  );

  if (has("--stats")) {
    await stats();
    return;
  }

  if (!client.semantic) {
    console.log(
      "\nWarning: the hashing embedder captures word overlap, not meaning. It is here so\n" +
        "the pipeline can be built and exercised offline. Set GEMINI_API_KEY and\n" +
        "RAG_EMBEDDING_DRIVER=gemini for retrieval that actually generalises.\n",
    );
  }

  const only = value("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
  const started = Date.now();

  // On the free tier a full index spends most of its time waiting out quota
  // windows. Without these it looks identical to a hang, and the natural
  // reaction - killing it - is the one thing that wastes the calls already
  // spent. Progress is durable: whatever was embedded stays embedded, and
  // re-running resumes rather than starting over.
  client.onProgress = (done, total) => {
    if (total > BATCH_NOISE_FLOOR) process.stdout.write(`\r  embedding ${done}/${total}...`);
  };
  client.onWait = (ms, attempt) => {
    process.stdout.write(
      `\r  rate limited - waiting ${Math.round(ms / 1000)}s (attempt ${attempt})   \n`,
    );
  };

  const report = await rebuildAll({ force: has("--force"), only });

  // Wipe the in-place progress line before the report prints under it.
  process.stdout.write(`\r${" ".repeat(40)}\r`);
  console.log("source        written  unchanged  removed");
  for (const [source, r] of Object.entries(report)) {
    console.log(
      `${source.padEnd(13)} ${String(r.written).padStart(7)} ${String(r.unchanged).padStart(10)} ${String(r.removed).padStart(8)}`,
    );
  }
  console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  await stats();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
