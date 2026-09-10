import "dotenv/config";
import { ragConfig } from "../shared/rag/config.js";
import { GeminiEmbeddingClient } from "../shared/rag/embeddings/gemini.js";
import { dot } from "../shared/rag/vector.js";

/**
 * Is the Gemini key working, and is it actually doing what it is here for?
 *
 * Run this before a full re-index. A bad key, a wrong model name or a rejected
 * dimensionality field all fail the same way at scale - a long index that ends
 * in an error - and this turns that into three small calls and a clear reason.
 *
 *   node scripts/rag-check.js
 *
 * The last check is the one that matters. Embedding two sentences that share no
 * words and expecting them to land close together is the entire premise of the
 * feature: if that number is low, retrieval will not answer "who has led a
 * team" no matter how well the rest of the pipeline works.
 */
const PASS = "  ok  ";
const FAIL = " FAIL ";

async function main() {
  const { apiKey, model: chatModel } = ragConfig.chat;
  const { model: embedModel, dimensions } = ragConfig.embeddings.gemini;

  if (!apiKey) {
    console.log(`${FAIL} GEMINI_API_KEY is not set in backend/.env`);
    console.log("\n       Get one at https://aistudio.google.com/apikey - it is free and");
    console.log("       needs no billing account. Then add to backend/.env:\n");
    console.log("         GEMINI_API_KEY=AIza...\n");
    process.exitCode = 1;
    return;
  }

  console.log(`key      ${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars)`);
  console.log(`embed    ${embedModel} @ ${dimensions} dimensions`);
  console.log(`chat     ${chatModel}\n`);

  // --- 1. embeddings ------------------------------------------------------
  const client = new GeminiEmbeddingClient({ apiKey, model: embedModel, dimensions });
  let vectors;
  try {
    vectors = await client.embed([
      "Managed a team of six engineers and owned delivery for the platform.",
      "Baked pastries and ran front-of-house service at a cafe.",
      // A control with no relationship to anything. It must rank LAST. An
      // earlier version of the client prepended a task-instruction sentence to
      // every text, which dominated short passages and pushed this line to
      // FIRST place - a comparison of only two sentences did not catch it.
      "The quick brown fox jumps over the lazy dog.",
    ]);
    console.log(`${PASS} embeddings work (${vectors[0].length} dimensions returned)`);
    console.log(`       dimensionality field accepted as: ${client.configShape}`);
  } catch (err) {
    console.log(`${FAIL} embeddings: ${err.message}`);
    if (err.status === 400) console.log("       Check GEMINI_EMBEDDING_MODEL is a real model id.");
    if (err.status === 403) console.log("       The key was rejected. Is it enabled for the Gemini API?");
    process.exitCode = 1;
    return;
  }

  if (vectors[0].length !== dimensions) {
    console.log(
      `${FAIL} asked for ${dimensions} dimensions, got ${vectors[0].length}. ` +
        "Set RAG_DIMENSIONS to match, or the store and queries will disagree.",
    );
    process.exitCode = 1;
  }

  // --- 2. chat ------------------------------------------------------------
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with the single word: ready" }] }],
          generationConfig: { temperature: 0 },
        }),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.log(`${FAIL} chat model: ${response.status} ${detail.slice(0, 160)}`);
      if (response.status === 404) {
        console.log(`       "${chatModel}" was not found. Set GEMINI_CHAT_MODEL to a model`);
        console.log("       your key can reach - see https://ai.google.dev/gemini-api/docs/models");
      }
      process.exitCode = 1;
    } else {
      const json = await response.json();
      const said = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text)
        .join("")
        .trim();
      console.log(`${PASS} chat model works (replied "${said.slice(0, 30)}")`);
    }
  } catch (err) {
    console.log(`${FAIL} chat model: ${err.message}`);
    process.exitCode = 1;
  }

  // --- 3. the whole point -------------------------------------------------
  const query = await client.embedOne("who has leadership experience");
  const q = Float32Array.from(query);
  const [managed, pastry, control] = vectors.map((v) => dot(q, Float32Array.from(v)));

  console.log(
    `\n       "who has leadership experience" vs\n` +
      `         "managed a team of six engineers"  ${managed.toFixed(3)}  <- must rank first\n` +
      `         "baked pastries, front-of-house"   ${pastry.toFixed(3)}\n` +
      `         "the quick brown fox..."           ${control.toFixed(3)}  <- must rank last`,
  );

  const spread = managed - control;
  const ordered = managed > pastry && pastry > control;

  if (!ordered) {
    console.log(
      `${FAIL} ranking is wrong - a paraphrase must beat an unrelated sentence, and an\n` +
        "       unrelated control must come last. Something is distorting the vectors\n" +
        "       (a task-instruction prefix on short texts will do exactly this).",
    );
    process.exitCode = 1;
    return;
  }

  console.log(`${PASS} ranking correct, spread ${spread.toFixed(3)} between match and control.`);

  // The absolute numbers sit in a narrow, high band for this model, so the
  // useful signal is the ORDER and the SPREAD, not the raw value. A floor set
  // near zero admits every document; see RAG_MIN_SCORE in docs/assistant.md.
  if (control >= ragConfig.retrieval.minScore) {
    console.log(
      `       note: the unrelated control scores ${control.toFixed(3)}, above RAG_MIN_SCORE ` +
        `(${ragConfig.retrieval.minScore}),\n       so the floor is admitting everything. ` +
        "Fine for ranking - RRF sorts by position -\n       but it means \"no match\" never registers as one.",
    );
  }

  console.log("\nReady. Next: npm run rag:index -- --force");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
