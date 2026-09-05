# CV Screening Engine

The engine that turns an uploaded CV into a ranked, explained score against a
job. It is **free, offline and deterministic** - no LLM, no external API. Every
number is arithmetic over the CV text and the job's own `weights` /
`hardFilters`, so the same CV against the same job always produces the same
score.

Before this, `hr/controllers/upload.controller.js` *simulated* scores with
`Math.random()` (the file said so). That simulator is now replaced by
`shared/engine/`.

---

## Pipeline

```
uploaded file (PDF / DOCX / TXT)
        │
        ▼
  extract text            shared/engine/extract.js   - pdf-parse · mammoth
        │
        ├─ unreadable / <40 chars ─────────────► score 0, reason note
        ▼
  five scored dimensions  shared/engine/dimensions.js
        │  skills · experience · education · certifications · keyword fit
        ▼
  weighted total (job.weights) → 0–100          shared/engine/index.js
        │
        ▼
  hard filters            job.hardFilters
        │  minYears · mustHaveSkills · workPermitRequired
        └─ any failure ► −15 pts + explanatory note (never blocked)
```

One CV takes ~30–150 ms (mostly PDF parsing). Processing is **synchronous and
inline** in the upload request - see [Limitations](#limitations--next-steps).

---

## The five dimensions

Each is a pure function returning a `0..1` fraction; the fraction is multiplied
by that dimension's weight from `job.weights` (which sum to 100).

| Dimension | How it's computed | Notes |
|---|---|---|
| **Skills match** | For each `job.requiredSkills` entry, build variants from a built-in alias map (`"JS"` ↔ `"JavaScript"`, `"postgres"` ↔ `"PostgreSQL"`, …) and test for a whole-word mention in the CV. Single-word skills of 5+ chars also match within one Levenshtein edit (typo tolerance). `fraction = matched / required`, plus a small bonus (max +0.1) for `niceToHaveSkills` hits. | Strongest signal; the job defines the vocabulary so a dictionary works well. |
| **Experience** | Two independent signals, larger wins: (1) the widest `2019 – 2023` / `2020 – present` date range on the page; (2) the largest `"N years [experience]"` phrase. `fraction = years / job.minYears` (capped at 1). | **Weakest part.** Free-text date maths is unreliable; treat the number as approximate. |
| **Education** | Keyword ladder - PhD (5) → Master's (4) → Bachelor's (3) → High school (1) → Diploma (2). The job's `educationLevel` string is ranked the same way. At or above requirement → 1; each rung short → −⅓; nothing detected → 0.15 floor. | "High school" is tested before "Diploma" so *"high school diploma"* reads as level 1. |
| **Certifications** | Substring match of each `job.certifications` entry against the CV. `fraction = matched / required`. No certs required → 1 (full marks). | |
| **Keyword fit** | TF-IDF cosine similarity between the CV and the job's own words (title + description + skill lists). Raw cosine on short docs sits ~0.05–0.35, so it is stretched ×2.5 and capped. | Hand-rolled in `text.js` (~30 lines). A rough "does this read like the job" signal; **not** semantic - it won't equate synonyms. |

Each dimension also emits a human-readable `note` (`"Matched 6 of 8 required
skills: React, TypeScript…"`, `"~4 yrs found vs 5 required"`) that the rank
board's score-explain drawer shows.

---

## Hard filters

Hard filters **do not block or queue** a candidate - a failure costs a flat
**−15 points** (floored at 0) and appends an explanatory note to the Skills-match
breakdown row. The candidate still gets a real score and still ranks, just lower
than an equivalent CV that met the requirement.

A failure is any of:

- **`hardFilters.minYears`** - estimated years below the floor.
- **`hardFilters.mustHaveSkills`** - a required-to-have skill isn't in the matched set.
- **`hardFilters.workPermitRequired`** - and the CV has no eligibility phrase
  (`"right to work"`, `"permanent resident"`, `"citizen"`, …).

**Unreadable file** (extraction failed, or under 40 characters of text - a
scanned / image-only CV) is separate: score `0`, a single breakdown row with the
reason, and it sorts to the bottom of the board.

`needsManualReview` stays on the `Application` schema (default `false`) but the
engine no longer sets it - nothing is auto-rejected and nothing is sent to a
review queue, matching the product's "the system suggests, the human decides"
pillar.

---

## Scoring math

```
score = Σ  round( weightᵢ × fractionᵢ )      for the 5 dimensions
score = clamp(score, 0, 100)
if hardFilterFailures: score = min(score, 40)
```

Example - a strong backend CV against the seeded "Senior backend engineer"
(weights: skills 45, experience 25, education 10, certs 10, keywords 10):

| Dimension | scored / weight | note |
|---|---|---|
| Skills match | 45 / 45 | Matched 6 of 6: Node.js, TypeScript, PostgreSQL, REST APIs, Docker, AWS |
| Experience | 25 / 25 | ~8 yrs found vs 5 required |
| Education | 10 / 10 | Detected: Bachelor's degree. Requirement: Bachelor's degree. |
| Certifications | 10 / 10 | Matched 1 of 1: AWS Solutions Architect |
| Keyword match | 7 / 10 | CV/description term overlap 29% (raw cosine) |
| **Total** | **97** | |

---

## Text extraction

| Format | Library | Note |
|---|---|---|
| PDF | `pdf-parse` v2 (wraps Mozilla `pdfjs-dist`) | Digital PDFs only. Scanned/image PDFs yield no text → score 0 with a reason. |
| DOCX | `mammoth` | Raw text; styling and layout discarded. |
| TXT | built-in | utf-8. |
| `.doc`, others | - | Unsupported → score 0 with a clear reason. |

Files are held in memory (`multer.memoryStorage`) only long enough to parse -
nothing is written to disk.

### Contact details

`contact.js` reads the candidate's **email, phone and name** off the same
parsed text, so an uploaded CV can actually be replied to. Nothing is
fabricated: a CV that prints no address stores an empty one, and the email
composer shows that candidate as unreachable instead of offering to write to
them. (The uploader used to build `first.last@example.com` out of the file
name, which looked real and sent every message nowhere.)

The heuristics are deliberately cautious - an absent address is honest, a wrong
one mails a stranger:

- **Email** - the earliest plausible match wins, since a CV's own address sits
  in the header; matches under a *References* heading are a referee's and are
  skipped unless the CV has no other. Asset artefacts (`logo@2x.png`) are
  rejected by their extension.
- **Phone** - 7-15 digits with an optional country code; year ranges
  (`2019 - 2022`) are not mistaken for numbers.
- **Name** - only a 2-4 word capitalised line in the first few, and never one
  containing a role word. Dataset CVs open with `HR ADMINISTRATOR` exactly
  where a name would sit; those fall back to the file name.

---

## API & data-flow changes

| Layer | Before | After |
|---|---|---|
| `POST /api/hr/upload/:jobId` | JSON body `{ fileNames: string[] }` | `multipart/form-data`, field **`cvs`** (repeatable), ≤ 8 MB/file, ≤ 200 files |
| `upload.routes.js` | - | `multer` memory storage + `upload.array("cvs", 200)` |
| `upload.controller.js` | `simulateApplication()` per filename | `screenCv({ buffer, fileName, mimeType }, job)` per real file → `insertMany` |
| `frontend/src/shared/lib/api.ts` | `uploadCvs(jobId, fileNames)` | `uploadCvs(jobId, files: File[])` → `FormData`; `request()` skips the JSON `Content-Type` for `FormData` bodies |
| `hr/pages/JobUpload.tsx`, `manager/pages/JobUpload.tsx` | faked progress with `setTimeout` | sends real files, drives row state (`scoring → scored %`) from the response |

The response is still the **blind** ranked list (identity fields stripped), so
the rank board, score drawer and shortlist flow are unchanged.

Audit log entry records the batch (and any unreadable files):
`"12 files to Senior backend engineer · 1 unreadable"`.

---

## Limitations & next steps

**Known weak spots**

- **Date/experience parsing** is heuristic - overlapping roles, gaps and
  non-standard formats throw it off.
- **Multi-column / graphical CV layouts** can defeat `pdf-parse` (text comes
  out jumbled) → the CV scores low or 0, which is the safe failure.
- **Keyword fit is lexical, not semantic** - "built REST services in Node" does
  not match "Node.js API development" unless a keyword literally overlaps.
- **Candidate name** is still derived from the filename (the blind board hides
  it anyway); the engine doesn't try to extract it from the CV body.

**Next steps, in rough priority order**

1. **Move off the request thread.** 100 CVs parsed inline can exceed an HTTP
   timeout on a slow host. Insert `Application`s as `status:"queued"` and drain
   with a worker (BullMQ + Redis, or a DB-polled job table). The board already
   polls, so rows would flip `queued → screened` live.
2. **Score candidate self-applications.** `candidate/apply.controller.js` still
   trusts skills typed into the form - route the applicant's uploaded CV
   through the same `screenCv`.
3. **Semantic keyword fit (still free).** Swap the TF-IDF cosine for local
   sentence embeddings via `@huggingface/transformers` +
   `all-MiniLM-L6-v2` (~90 MB, CPU, no API). Same interface, better recall.
4. **Optional "LLM mode."** Add an `scoreCv` implementation that calls a model
   for extraction + notes, behind the same function signature, toggled per
   company or per job.
5. **OCR** for scanned CVs (Tesseract locally, or a cloud document-AI service).

---

## Built vs borrowed

### Built in this repo

Every scoring decision is code written here - nothing forked or copied from a
CV-screening library.

| Component | File | What it does |
|---|---|---|
| Upload controller / orchestration | `backend/hr/controllers/upload.controller.js` | Loop files → `screenCv` → build & `insertMany` blind `Application` records; audit entry |
| Engine entry point | `backend/shared/engine/index.js` | `screenCv(file, job)` - reads job criteria, runs the 5 dimensions, weighted sum, breakdown notes, hard-filter penalty, score clamp |
| Text extraction wrapper | `backend/shared/engine/extract.js` | Picks PDF / DOCX / TXT path by mime+extension; normalises failures to `{ ok:false, reason }` |
| Skills dimension | `backend/shared/engine/dimensions.js` → `scoreSkills` | Built-in **skill alias map**, whole-word mention test, 1-edit fuzzy match, nice-to-have bonus |
| Experience dimension | `dimensions.js` → `estimateYears`, `scoreExperience` | Date-range regex (`2019 – present`) + `"N years"` phrase regex, larger wins; ÷ `minYears` |
| Education dimension | `dimensions.js` → `detectEducation`, `scoreEducation` | Degree **keyword ladder** (PhD…High school) + requirement ranking + partial credit |
| Certifications dimension | `dimensions.js` → `scoreCertifications` | Substring match of `job.certifications` |
| Keyword-fit dimension | `dimensions.js` → `scoreKeywords` | Calls the TF-IDF cosine, scales ×2.5, caps |
| Title / eligibility helpers | `dimensions.js` → `guessTitles`, `hasWorkEligibilitySignal` | Heuristic current/past titles; work-permit phrase check |
| Text maths | `backend/shared/engine/text.js` | `normalize`, `tokenize`, stopword list, **Levenshtein**, **TF-IDF cosine similarity** - all hand-implemented, zero dependencies |
| Hard filters | `index.js` → `hardFilterFailures` | `minYears`, `mustHaveSkills`, `workPermitRequired` - failure = −15 pts + note, never blocked |

### Borrowed (npm packages)

None of these do any screening - they are file readers and an upload parser.
Downloaded by `bun add` from `https://registry.npmjs.org`.

| Package | Version | License | Source | Used in | Role in the engine |
|---|---|---|---|---|---|
| `multer` | 2.3.0 | MIT | github.com/expressjs/multer | `hr/routes/upload.routes.js` | Parse `multipart/form-data`; hand each CV to the controller as an in-memory buffer |
| `pdf-parse` | 2.4.5 | Apache-2.0 | github.com/mehmet-kozan/pdf-parse | `shared/engine/extract.js` | PDF bytes → plain text |
| `mammoth` | 1.12.2 | BSD-2-Clause | github.com/mwilliamson/mammoth.js | `shared/engine/extract.js` | DOCX bytes → plain text |

**What runs underneath the borrowed layer** (transitive, not called directly):

| Under | Package | Source | Note |
|---|---|---|---|
| `pdf-parse` | `pdfjs-dist` | github.com/mozilla/pdf.js | Mozilla's PDF.js - the actual PDF decoder (same engine Firefox uses) |
| `pdf-parse` | `@napi-rs/canvas` | github.com/Brooooooklyn/canvas | Prebuilt native binaries, only for its screenshot/image features; not exercised by text extraction |
| `mammoth` | `@xmldom/xmldom`, `jszip` | github.com/xmldom, github.com/Stuk/jszip | Unzip the `.docx` and read its XML |
| `multer` | `busboy` | github.com/mscdex/busboy | Streaming multipart parser |

### Deliberately not used

No LLM API, no pretrained ML model, no résumé-parsing service (Affinda,
RChilli, Textkernel/Sovren, HireAbility). That is what keeps the engine free,
offline and deterministic.

## File map

```
backend/shared/engine/
  index.js        screenCv(file, job) - orchestrator, weighting, hard filters
  extract.js      bytes → text (pdf-parse · mammoth · txt)
  contact.js      text → candidate email · phone · name (never fabricated)
  dimensions.js   the 5 scorers + skill aliases + education ladder
  text.js         normalise · tokenise · Levenshtein · TF-IDF cosine (no deps)
```

## Testing

Unit-level (no DB, deterministic):

```js
import { screenCv } from "./backend/shared/engine/index.js";
const r = await screenCv(
  { buffer: Buffer.from(cvText, "utf8"), fileName: "a.txt", mimeType: "text/plain" },
  job, // any object with requiredSkills / minYears / educationLevel / weights / hardFilters
);
// r.score, r.scoreBreakdown, r.reasons (hard-filter notes), …
```

End-to-end: `POST /api/hr/upload/:jobId` with `-F "cvs=@some-cv.pdf"` and an HR
or manager bearer token → `201` with the blind ranked array.

Cross-domain: a 24-CV mixed-domain sample set (real resumes, 12 fields, 2 each)
lives in `Resumes/sample-mix/` (gitignored). `node Resumes/sample-mix/run-matrix.mjs`
scores every CV against five jobs from different domains and prints the
score gradient - see that folder's `README.md`.
