# Mixed-domain sample CVs

24 real resumes (2 per domain) pulled from the Kaggle *Resume Dataset*
(`snehaanbhawal/resume-dataset`), picked so each one has **extractable text**
(no scans). Renamed `DOMAIN-NN.pdf` so you always know a CV's true field when
you screen it against a job from a *different* field.

**This folder is gitignored** - real resumes, never commit them.
`MANIFEST.json` records the original Kaggle file id for each.

| File | True domain | Chars of text |
|---|---|---|
| `HEALTHCARE-01/02.pdf` | Healthcare (clinical social work / behavioural health) | 11.7k / 5.5k |
| `TEACHER-01/02.pdf` | Education | 6.3k / 1.6k |
| `ADVOCATE-01/02.pdf` | Legal | 3.9k / 5.0k |
| `ACCOUNTANT-01/02.pdf` | Accounting | 24k / 7.5k |
| `CHEF-01/02.pdf` | Culinary | 4.8k / 5.3k |
| `FITNESS-01/02.pdf` | Fitness / training | 6.3k / 5.4k |
| `AVIATION-01/02.pdf` | Aviation | 5.6k / 8.8k |
| `BANKING-01/02.pdf` | Banking | 4.6k / 5.6k |
| `SALES-01/02.pdf` | Sales | 5.5k / 6.2k |
| `INFORMATION-TECHNOLOGY-01/02.pdf` | IT | 8.3k / 7.1k |
| `ENGINEERING-01/02.pdf` | Engineering | 2.7k / 7.8k |
| `DESIGNER-01/02.pdf` | Design | 1.7k / 5.8k |

> The Kaggle folders are grab-bags - e.g. `HEALTHCARE` here is a *clinical
> social worker*, not a nurse; `CHEF-01` reads as an executive chef, not a line
> cook. That variety is useful: it shows the engine ranking on what the CV
> actually says, not on a folder label.

---

## How to test

### 1. In the app
1. `bun run dev`, sign in as HR (`sadia@bengalrecruitment.com` / `demo1234`).
2. Create a job in **any** domain (Jobs → New) - set its skills, min years,
   education, certs, weights, and optionally `hardFilters`.
3. Open the job → **Upload** tab → drop some of these PDFs.
4. Read the rank board and open a row's score breakdown.

Try the same batch against jobs from several domains and watch the ordering
change.

### 2. Cross-domain matrix (no DB)
```
node Resumes/sample-mix/run-matrix.mjs      # from the repo root
```
Scores every CV here against 5 jobs (Nurse, Accountant, Teacher, Backend,
Line Cook) and prints two tables - **RAW** (hard filters off) and **REAL**
(hard filters on: a failed must-have skill / min-years costs −15 pts, nothing
is blocked).

---

## Reading the numbers

From a sample run (RAW table):

| CV | own-domain job | other-domain jobs |
|---|---|---|
| `CHEF-02` | Line Cook **83** | 28–30 |
| `ACCOUNTANT-02` | Staff Accountant **57** | 10–25 |
| `TEACHER-01` | High School Teacher **54** | 27 |

- **Skills match** and **Keyword fit** are what separate an in-domain from an
  out-of-domain candidate - they depend on the CV containing that job's
  vocabulary.
- **Experience** and **Education** are domain-blind by design: a senior person
  in *any* field earns those points, so a total in the 30s/40s with **no skills
  matched** just means "experienced, degree-holding, wrong field".
- **Hard filters** (`mustHaveSkills`, `minYears`) are *soft* - a failure takes
  −15 points and adds a note ("Missing must-have skill: food safety"), but the
  candidate still ranks. Nothing is blocked or sent to a review queue.
- An **unreadable file** (scan / image-only PDF) scores 0 with a "File" note and
  sinks to the bottom.
- A CV that scores low even in its own column (e.g. `CHEF-01` → Line Cook 17)
  usually means that particular resume is a different sub-role (pastry / exec
  chef) whose wording doesn't hit the job's skill phrases.
