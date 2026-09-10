import "dotenv/config";
import { ragConfig } from "../shared/rag/config.js";
import { embeddingClient } from "../shared/rag/embeddings/index.js";
import { dot } from "../shared/rag/vector.js";

/**
 * Is the assistant's plumbing working, and is retrieval actually matching
 * meaning rather than words?
 *
 * Run it before a full index. A missing model, a rejected key or a wrong model
 * name all fail the same way at scale - a long index that ends in an error -
 * and this turns that into a few small calls and a clear reason.
 *
 *   node scripts/rag-check.js
 *
 * The last check is the one that matters. It embeds a paraphrase, an unrelated
 * sentence and a nonsense control, then insists on the ranking. A prepended
 * instruction sentence once pushed the CONTROL to first place on both Gemini
 * and bge, while a two-sentence comparison still looked fine - so the control
 * stays, and its position is asserted.
 */
const PASS = "  ok  ";
const FAIL = " FAIL ";

const QUERY = "who has leadership experience";
const PROBES = [
  ["managed a team of six engineers", "Managed a team of six engineers and owned delivery for the platform."],
  ["baked pastries, front-of-house", "Baked pastries and ran front-of-house service at a cafe."],
  ["the quick brown fox...", "The quick brown fox jumps over the lazy dog."],
];

let failed = false;
const fail = (...args) => {
  failed = true;
  console.log(FAIL, ...args);
};

async function checkEmbeddings() {
  const client = embeddingClient();
  console.log(`embed    ${client.model}`);

  if (!client.semantic) {
    fail(
      "the hashing driver has no semantics - it matches words, not meaning.\n" +
        "       It exists for tests. Set RAG_EMBEDDING_DRIVER=local (no key needed).",
    );
    return null;
  }

  let vectors;
  const started = Date.now();
  try {
    vectors = await client.embed(PROBES.map((p) => p[1]));
  } catch (err) {
    fail(`embeddings: ${err.message}`);
    if (err.status === 403) console.log("       The key was rejected. Is it enabled for the Gemini API?");
    if (err.status === 400) console.log("       Check the embedding model id.");
    return null;
  }

  console.log(
    `${PASS} embeddings work (${vectors[0].length} dimensions, ${Date.now() - started}ms for ${PROBES.length})`,
  );

  const query = await client.embedOne(QUERY);
  const q = Float32Array.from(query);
  const scores = vectors.map((v) => dot(q, Float32Array.from(v)));

  console.log(`\n       "${QUERY}" vs`);
  PROBES.forEach(([label], i) => {
    const marker = i === 0 ? "  <- should rank first" : i === PROBES.length - 1 ? "  <- must rank last" : "";
    console.log(`         "${label}"`.padEnd(45) + scores[i].toFixed(3) + marker);
  });

  const control = scores[scores.length - 1];
  if (control !== Math.min(...scores)) {
    fail(
      "the unrelated control did not rank last. Something is distorting the\n" +
        "       vectors - a task-instruction prefix on short texts will do exactly this.",
    );
    return null;
  }

  const spread = Math.max(...scores) - control;
  console.log(`${PASS} ranking correct, spread ${spread.toFixed(3)} between best and control.`);

  // The floor only does work when non-matches score like non-matches. Some
  // models (Gemini among them) compress everything into a narrow high band,
  // where any floor near zero admits the whole corpus.
  if (control >= ragConfig.retrieval.minScore) {
    console.log(
      `       note: the control scores ${control.toFixed(3)}, above RAG_MIN_SCORE ` +
        `(${ragConfig.retrieval.minScore}),\n       so the floor admits everything. Harmless for ranking - ` +
        "RRF sorts by\n       position - but \"no match\" never registers as one.",
    );
  }

  return client;
}

async function checkChat() {
  const { apiKey, model } = ragConfig.chat;
  console.log(`chat     ${model}`);

  if (!apiKey) {
    fail("GEMINI_API_KEY is not set - the assistant cannot answer.");
    console.log("\n       Get one free at https://aistudio.google.com/apikey, then add to");
    console.log("       backend/.env:  GEMINI_API_KEY=...\n");
    return;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: ready" }] }],
        generationConfig: { temperature: 0 },
      }),
    },
  );

  if (response.ok) {
    const json = await response.json();
    const said = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text).join("").trim();
    console.log(`${PASS} chat model works (replied "${said.slice(0, 30)}")`);
    return;
  }

  const detail = await response.text().catch(() => "");
  const quota = /limit: (\d+)/.exec(detail);
  const retry = /retryDelay"?:?\s*"?(\d+(?:\.\d+)?)s/.exec(detail);

  if (response.status === 429) {
    // Not a failure of setup. The free tier's per-minute window is small, and
    // saying so beats reporting a broken assistant.
    console.log(
      `${PASS} chat key is valid, but rate limited right now` +
        `${quota ? ` (limit ${quota[1]}/min)` : ""}${retry ? `, clear in ${Math.ceil(Number(retry[1]))}s` : ""}.`,
    );
    return;
  }
  if (response.status === 503) {
    console.log(`${PASS} chat key is valid; the model is under load (503). Transient - retries handle it.`);
    return;
  }

  fail(`chat model: ${response.status} ${detail.slice(0, 160)}`);
  if (response.status === 404) {
    console.log(`       "${model}" was not found. Set GEMINI_CHAT_MODEL to one your key can reach.`);
  }
}

async function main() {
  await checkEmbeddings();
  console.log();
  await checkChat();

  if (failed) {
    process.exitCode = 1;
    return;
  }
  console.log("\nReady. Next: npm run rag:index");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
