# Screenwise

A MERN, **multi-tenant** rebuild of the Screenwise CV-screening app,
organized by actor so any piece of frontend/backend code can be found by role.

## Actors

- **Candidate** — global, free forever. Register/login, browse every open job
  from every company, apply with a CV, track application status.
- **Company** — a paying organisation on a plan (Basic / Advance / Custom).
  Registering a company creates its single **Manager**.
  - **Manager** — company owner. Full recruiter powers **plus** add/deactivate
    HR (bounded by the plan's seat limit) and switch plan.
  - **HR** — belongs to one company, created by its Manager. Posts jobs,
    screens the blind rank board, shortlists, emails. Everything is scoped to
    the company; all company members share visibility of the company's jobs.
- **Super admin** — platform operator (seeded only). Dashboard, all companies
  with plan / seat usage / expiry / access state, renew or revoke a company's
  access, edit the plan cards a manager sees when choosing a plan, global
  users list, audit log.

A company whose subscription has **expired** or been **revoked** has its
Manager + HR blocked at login until a super admin renews it; candidates and
public job listings are unaffected.

Billing is a plan *selection* only — there is no payment integration, and
outgoing candidate emails are simulated (logged, never delivered).
