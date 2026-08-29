# Contributing

## Prerequisites

- [Node.js](https://nodejs.org) 22 (see [`.nvmrc`](.nvmrc))
- [Bun](https://bun.sh) 1.4+ — the package manager and script runner for this repo
- A MongoDB database (local or Atlas) for the backend

## Setup

```bash
bun install                          # installs both workspaces at once

cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
# then fill in backend/.env (MONGODB_URI, JWT_SECRET)
```

## Running

```bash
bun run dev            # frontend (:8080) + backend (:5000) together
bun run dev:frontend   # frontend only
bun run dev:backend    # backend only
bun run build          # production build of the frontend
bun run seed           # seed the database
```

## Repository layout

This is a Bun-workspaces monorepo:

| Path        | Package             | What it is                       |
|-------------|---------------------|----------------------------------|
| `frontend/` | `scanwise-frontend` | React + Vite single-page app     |
| `backend/`  | `scanwise-backend`  | Express + Mongoose REST API      |

Each workspace keeps its own `package.json`, and the frontend keeps its own
`tsconfig.json` and `vite.config.ts` — those are resolved relative to the
workspace folder and must stay there. Only cross-cutting project files live at
the repo root.

The code inside each workspace is organized **by actor** (candidate, hr,
company/manager, admin). See [docs/architecture.md](docs/architecture.md).

## Commits & branches

- Branch off `main`; open a pull request back into it.
- Keep commits focused; write subjects in the imperative mood
  ("Add company plan switch", not "added ...").
