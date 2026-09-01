# Architecture

Screenwise is a multi-tenant MERN application. Both the API and the SPA are
organized **by actor**, so any feature can be located by the role it belongs to.

## Workspaces

| Path        | Package             | Stack                                     | Dev port |
|-------------|---------------------|-------------------------------------------|----------|
| `frontend/` | `scanwise-frontend` | React 19, Vite, Tailwind v4, React Query  | 8080     |
| `backend/`  | `scanwise-backend`  | Express 4, Mongoose 8, JWT auth           | 5000     |

The frontend reaches the backend through `VITE_API_BASE_URL`
(`http://localhost:5000/api` by default). Each workspace has its own `.env`,
loaded from its own folder.

## Actors

- **Candidate** - global, free forever. Register/login, browse every open job
  from every company, apply with a CV, track application status.
- **Company** - a paying organisation on a plan (Basic / Advance / Custom).
  Registering a company creates its single **Manager**.
  - **Manager** - company owner. Full recruiter powers **plus** add/deactivate
    HR (bounded by the plan's seat limit) and switch plan.
  - **HR** - belongs to one company, created by its Manager. Posts jobs, screens
    the blind rank board, shortlists, emails. Everything is scoped to the
    company; all company members share visibility of the company's jobs.
- **Super admin** - platform operator (seeded only). Dashboard, all companies
  with plan / seat usage / expiry / access state, renew or revoke access, edit
  the plan cards a manager sees when choosing a plan, global users list, audit
  log.

## Backend layout

```
backend/
  server.js      Express app - mounts every actor's routes under /api/*
  shared/        config (db), middleware (auth, error), models, seed, utils
  shared/engine/ free offline CV screening engine - see screening-engine.md
  auth/          register / login, JWT issuing
  candidate/     public job list, apply, my applications
  hr/            jobs, blind rank board, shortlist, upload, email, dashboard
  company/       company + manager: HR seats, plan switching
  admin/         super admin: dashboard, companies, users, audit, plans
  scripts/       one-off scripts (seed)
```

CV scoring for bulk HR upload runs through
[`shared/engine/`](screening-engine.md): extract text → five weighted
dimensions → hard filters. Dependency-light, offline, deterministic - no LLM.

### API surface

All routes are mounted under `/api` (see `backend/server.js`):

- `/api/auth`, `/api/plans`
- `/api/candidate/{jobs,apply,applications}`
- `/api/hr/{jobs,board,shortlist,upload,email,dashboard}`
- `/api/company`
- `/api/admin/{dashboard,companies,users,audit,plans}`

## Frontend layout

```
frontend/
  index.html     Vite entry
  src/
    main.tsx     app bootstrap
    App.tsx      router
    shared/      api client, auth context, UI kit, common pages
    candidate/   hr/   admin/   company/(manager)   actor-scoped pages & components
```

Path alias: `@/*` → `frontend/src/*` (defined in `frontend/tsconfig.json`).
