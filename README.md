# Screenwise

A MERN, **multi-tenant** rebuild of the Screenwise CV-screening app,
organized by actor so any piece of frontend/backend code can be found by role.

## Repository layout

Bun-workspaces monorepo - two apps, shared tooling at the root.

```
screenwise/
├── frontend/          scanwise-frontend - React + Vite SPA        (:8080)
├── backend/           scanwise-backend  - Express + Mongoose API   (:5000)
├── docs/              architecture notes
├── package.json       workspaces + top-level scripts
├── .env.example       how to set up each workspace's .env
└── .editorconfig · .nvmrc · .gitignore
```

Each workspace owns its own `package.json` (and the frontend its own
`tsconfig.json` / `vite.config.ts`) - those resolve paths relative to their
folder and stay there.

## Getting started

Prerequisites: [Node.js](https://nodejs.org) 22 and [Bun](https://bun.sh) 1.4+.

```bash
bun install                          # installs both workspaces

cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
# fill in backend/.env (MONGODB_URI, JWT_SECRET)

bun run dev                          # frontend + backend together
```

Other scripts: `bun run dev:frontend`, `bun run dev:backend`,
`bun run build`, `bun run seed`. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Sending candidate emails

The composer on a job's **Email** tab sends one personalised message per
shortlisted candidate, with `{{candidate_name}}`, `{{job_title}}`,
`{{company_name}}` and `{{hr_name}}` filled in per recipient. Replies go to the
HR user who sent it, and no candidate ever sees another candidate's address.

Delivery is driver-based, picked from `backend/.env` - no code changes to
switch provider:

| Driver    | Set                          | Behaviour                                    |
| --------- | ---------------------------- | -------------------------------------------- |
| `resend`  | `RESEND_API_KEY`, `MAIL_FROM`| Sends over HTTPS. Recommended.               |
| `smtp`    | `SMTP_HOST` + friends        | Any SMTP server (Gmail, SES, Mailtrap, …).   |
| `console` | nothing                      | Logs to the server, delivers nothing.        |

With nothing configured the app falls back to `console`, and the composer says
so in a banner rather than pretending the mail went out. Every send is recorded
in the job's sent log with a per-recipient sent/failed outcome, so a bounce or a
rejected address is visible instead of silent.

[backend/.env.example](backend/.env.example) walks through both providers.

## Actors

- **Candidate** - global, free forever. Register/login, browse every open job
  from every company, apply with a CV, track application status.
- **Company** - a paying organisation on a plan (Basic / Advance / Custom).
  Registering a company creates its single **Manager**.
  - **Manager** - company owner. Full recruiter powers **plus** add/deactivate
    HR (bounded by the plan's seat limit) and switch plan.
  - **HR** - belongs to one company, created by its Manager. Posts jobs,
    screens the blind rank board, shortlists, emails. Everything is scoped to
    the company; all company members share visibility of the company's jobs.
- **Super admin** - platform operator (seeded only). Dashboard, all companies
  with plan / seat usage / expiry / access state, renew or revoke a company's
  access, edit the plan cards a manager sees when choosing a plan, global
  users list, audit log.

## Documentation

- [docs/architecture.md](docs/architecture.md) - workspaces, actor model, API surface
- [CONTRIBUTING.md](CONTRIBUTING.md) - setup, scripts, conventions
