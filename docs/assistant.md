# The Screenwise Assistant (RAG)

A retrieval-augmented assistant over the data each account can already see.
It answers the questions the screening engine cannot: the engine matches only
the vocabulary an HR user typed into the job form, and this reads what the CVs
actually say.

There is **no vector database**. Vectors live in a normal Mongo collection as
packed float32, and similarity is computed in Node — because visibility
filtering runs first, so one question is only ever scored against a few hundred
documents. See [Why no vector database](#why-no-vector-database).

---

## What it answers

| Actor | Questions it can now answer | Why it couldn't before |
|---|---|---|
| **HR / Manager** | "Who has led a team?" · "Anyone with fintech experience?" · "Who has built REST APIs?" | The board ranks against `job.requiredSkills` only. Anything the form never named is invisible to it. |
| **Candidate** | "Why did I score 62?" · "What should I add to my CV?" · "Which open roles suit me?" | `MyApplications` shows a status word. The breakdown that explains the score stopped at the recruiter. |
| **Any role** | "What does the blind board hide?" · "Why did a hard filter cost 15 points?" | Four roles, a plan gate and blind screening — none of it derivable from a row. |
| **Super admin** | Product documentation only | Deliberate: an operator cannot read customers' candidates through the assistant. |

---

## Pipeline

```
                    INGESTION                                RETRIEVAL
  Application · Job · Candidate · docs/*.md         a question from a signed-in user
        │                                                        │
        ▼  builders/ - rows rendered as prose                     ▼
   redact CV text  (redact.js)                        visibility filter (SQL-side)
        │  identity removed, permanently                          │  companyId · jobId
        ▼                                                         │  visibleToUserId
   chunk at 1200 chars  (chunk.js)                                ▼
        │                                            ┌────────────┴────────────┐
        ▼  skip unchanged (contentHash)              │                         │
   embed in batches of 64                      cosine vs. query          BM25 keywords
        │                                       (min_score 0.15)         (k1 1.4, b 0.75)
        ▼                                            └────────────┬────────────┘
   ragdocuments  (float32 Buffer)                                 ▼
                                                    reciprocal rank fusion (k=60)
                                                                  │
                                                                  ▼
                                                        top 6 become context
                                                                  │
                                                                  ▼
                                            Gemini Flash, tool-calling  (assistant/service.js)
```

---

## The security model

Visibility is a **Mongo filter applied before any scoring**, not a sentence in a
prompt. A document the caller may not see is never a candidate, never ranked,
and never reaches the model. A `$match` cannot be talked out of its filter.

Three walls, because Screenwise has three:

| Field | Wall |
|---|---|
| `companyId` | The tenant. Mirrors `tenantFilter` in the auth middleware. |
| `jobId` | Scopes a CV passage to the pile it was screened into. |
| `visibleToUserId` | Pins a document to one account (a candidate's own score). |

Plus `publicRead` for open, publicly-applyable job posts, which any signed-in
candidate may read.

**The blind board.** CV passages are redacted at **index** time,
unconditionally — names, emails, phones, profile URLs and handles are gone
before a vector is ever made. Not at answer time, and not conditionally on
status, for two reasons: a leak is permanent once text has been embedded and
handed to a model, and shortlisting would otherwise have to re-embed every
passage to reveal a name. A shortlisted candidate's identity is read from the
shortlist endpoint, which is where it already lives.

Redaction deliberately keeps what recruiters actually search on. `2019–2023`,
`Node.js`, `asp.net`, `socket.io` and a GPA all survive; a phone number needs
nine digits (or a leading `+`) to be treated as one, so date ranges are not
mistaken for contact details.

> `npm run rag:audit` asserts all of this against the real store and exits
> non-zero on failure. Nine checks: tenant crossing, candidate crossing, CV
> passages reaching a candidate, an operator reaching a profile, and email
> addresses surviving in any indexed passage.

---

## Why hybrid, and why it needs a real embedding model

The two halves fail in opposite directions. Embeddings generalise but blur
exact tokens; keywords nail exact tokens but cannot paraphrase. Half of
recruiting vocabulary is proper nouns (`Kubernetes`, `AWS Solutions Architect`)
sitting next to exactly the paraphrase the screening engine admits it cannot
do.

Fusion is by **position**, not score: cosine and BM25 live on different scales,
and weighting them directly needs recalibrating whenever either side moves.

**This is the part to get right.** "No vector database" does not mean "no
vectors". The offline `hashing` embedder is for development only — it matches
words, not meaning, so `"led a team"` will not find `"managed six engineers"`,
which is the entire point of the feature. `npm run rag:eval` prints a vector
column of zeros when it is active. Ship with `GEMINI_API_KEY` set.

### Two calibration findings, measured on this corpus

**Do not prepend a task instruction to the text.** `gemini-embedding-2` dropped
the `taskType` parameter, and the obvious reading — put the instruction in the
text instead — measurably makes retrieval *worse* here. A fixed ~9-word prefix
is a large share of a short CV passage, so every vector is dragged toward the
prefix's own direction and the gap between a match and a non-match collapses.
Query `"who has leadership experience"`:

| passage | no prefix | with prefix |
|---|---|---|
| "managed a team of six engineers" | **0.621** (1st) | 0.740 (3rd) |
| "baked pastries, front-of-house" | 0.566 | 0.685 |
| "the quick brown fox…" (control) | 0.499 (last) | **0.759 (1st)** |
| *spread* | *0.122* | *0.076* |

An unrelated control sentence ranked **first** with the prefix. Both sides are
now embedded as raw text, and `npm run rag:check` keeps that control in place so
the regression cannot come back unnoticed.

**`RAG_MIN_SCORE` is model-specific, and 0.15 is far too low for this one.**
Gemini's cosines sit in a narrow, high band — an unrelated sentence still scores
~0.50 — so a 0.15 floor admits every document. That is harmless for *ranking*,
because RRF fuses by position rather than score, but it means "nothing matched"
never registers as such, and six irrelevant passages become context anyway.
Raise it only against measured numbers from your own corpus; `rag:check` prints
the control's score so you can see where the floor actually sits.

---

## Configuration

All of it env-driven; see [`backend/.env.example`](../backend/.env.example).

| Variable | Default | Note |
|---|---|---|
| `GEMINI_API_KEY` | — | One key covers embeddings and chat. |
| `RAG_EMBEDDING_DRIVER` | `gemini` when a key is present, else `hashing` | `hashing` is never a silent production fallback — it warns. |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-2` | v2 takes its task instruction in the text; `-001` takes `taskType`. Both are handled. |
| `GEMINI_CHAT_MODEL` | `gemini-3.8-flash` | |
| `RAG_DIMENSIONS` | `768` | Matryoshka: a real prefix of the full 3072 at a quarter the cost. **Changing it requires a full re-index** — vectors of different widths cannot be compared. |
| `RAG_RETRIEVAL_MODE` | `hybrid` | `vector` / `lexical` exist so fusion's value can be measured. |
| `RAG_TOP_K` | `6` | More context is not more accuracy. |
| `RAG_MIN_SCORE` | `0.15` | Below this is "no match", not "the closest thing I have". |
| `RAG_AUTO_REINDEX` | `true` | Off for scripts that bulk-load fixtures. |
| `RAG_EMBED_BATCH` | `25` | Texts per API call. A batch appears to count per *text* against the free quota, not per call. |
| `RAG_EMBED_PACE_MS` | `1500` | Pause between batches. Set `0` on a paid key. |
| `RAG_EMBED_RETRIES` | `6` | 429s honour Google's own `retryDelay`, backing off up to 70s. |

### A note on the Gemini free tier

Google's pricing page marks free-tier content as **used to improve their
products**; the paid tier does not. CV text is *other people's* personal data,
not the account holder's. The free tier is right for building and demos, and a
deliberate decision for real candidate CVs. Nothing else changes when you
switch — same key, same model, same code.

---

## Commands

```bash
npm run rag:check               # is the key live, and is it matching meaning?
npm run rag:index               # incremental - only what changed
npm run rag:index -- --force    # re-embed everything
npm run rag:index -- --only=cv  # one source
npm run rag:stats               # what is stored, index nothing
npm run rag:audit               # security boundary checks (exits non-zero on failure)
npm run rag:eval                # retrieval quality across all three modes
npm run rag:backfill            # recover CV text for pre-existing applications
```

---

## CV text retention

Before this feature, `screenCv` extracted a CV's text, scored it and dropped
it. `Application.cvText` now keeps it (`select: false`, so it is never in an
ordinary query or any API response), and both screening paths store it.

Nothing about scoring changed — the engine returns the text it had already
extracted, and no dimension reads it.

Historic applications can be partly recovered: `npm run rag:backfill`
re-extracts text wherever the bytes were kept (self-applied submissions and
profile CVs). **HR-uploaded batches from before retention are not
recoverable** — those files were held in memory only long enough to score.
Those applications keep their scores and simply do not appear in the CV corpus.

---

## Why no vector database

The visibility filter runs first, so after scoping to one job's pile there are
a few hundred candidates — 200 CVs at roughly four passages each. An
approximate-nearest-neighbour index earns nothing until that number is in the
tens of thousands, and it would be a second system to run, configure and keep
in sync.

Two decisions make the in-app version hold up at this size:

- **Vectors are stored as packed float32**, not a BSON array of doubles. An
  array costs 8 bytes per element plus per-element key overhead, and retrieval
  reads *every* candidate's vector on every question. At 768 dimensions this is
  ~3 KB per document instead of ~13 KB.
- **Vectors are unit-normalised at embed time**, so similarity is a plain dot
  product rather than a magnitude division per comparison. This also repairs
  Matryoshka truncation: the first 768 numbers of a 3072-dimension unit vector
  are *not* unit length, and comparing un-normalised truncations skews every
  score.

### When to move

When the post-filter candidate count reaches tens of thousands. You are already
on Atlas, so both halves exist natively:

- **`$vectorSearch`** — declare a `vectorSearch` index on `embedding` with
  `numDimensions` and `similarity: "cosine"`, and put the visibility clause in
  the stage's `filter` field so scoping still happens *before* ranking. Fields
  used in `filter` must be declared as `filter` type in the index definition.
  Note this requires storing the vector as an array rather than a Buffer.
- **`$search`** — Lucene BM25, replacing the hand-written scorer.
- Fuse with `$rankFusion` on MongoDB 8.1+, or run both with `$unionWith` and do
  the RRF arithmetic in Node exactly as `retriever.js` does now.

The swap is [`retriever.js`](../backend/shared/rag/retriever.js) and nothing
else. Everything upstream and downstream of it is unaware of how ranking
happens.

---

## File map

```
backend/shared/rag/
  config.js         every knob, env-driven
  visibility.js     the security boundary - who may retrieve what
  retriever.js      scope -> two rankings -> RRF -> top K
  indexer.js        ingestion, incremental hashing, narrow re-index hooks
  draft.js          a document before it has a vector
  chunk.js          structure-first splitting
  redact.js         identity out of CV text, permanently
  vector.js         float32 packing, normalisation, dot product
  scoring/bm25.js   keyword half - reuses engine/text.js tokenising
  embeddings/       gemini · hashing, behind one interface
  builders/         cv · job · application · policy · profile
  assistant/
    tools.js        what the model may look up - each re-scopes on the user
    service.js      Gemini tool-calling loop and the system prompts

backend/assistant/              routes + controller  (/api/assistant)
backend/shared/models/RagDocument.model.js
backend/scripts/rag-{index,audit,eval,backfill-cv-text}.js
frontend/src/shared/components/AssistantPanel.{tsx,css}
```

---

## Design rules worth keeping

1. **Retrieval is scoped in the database, never in the prompt.**
2. **Don't use RAG where a lookup works.** Counts, scores and rankings come from
   `get_rank_board` and `get_application` — Mongo queries. Asking a vector
   search "how many scored above 70" gets a confident guess.
3. **Every fact in a reply comes from a tool result.** The model chooses which
   lookup to run and how to word the answer; it never supplies the scope.
4. **The deterministic score is untouched.** The engine stays auditable and
   explainable; the assistant sits beside it to explain and explore, never to
   re-score.
5. **No writes.** The assistant cannot shortlist, edit weights or send mail.
   `AuditLog` has no concept of an AI actor yet, and "the system suggests, the
   human decides" is a product pillar.
