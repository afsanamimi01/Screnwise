# ScanWise

A MERN rebuild of the Screenwise CV-screening app, organized by actor
(admin, hr, manager, candidate) so any piece of frontend/backend code can be
found by role. See `Frontend from loveable/` (sibling folder) for the
original Lovable-generated reference this was rebuilt from.

Currently implemented: the **candidate** actor, full-stack (public job
browsing, sign in/register, apply with CV, track application status), backed
by a real Express + MongoDB Atlas API. Other actors (hr/manager/admin) are
scaffolded but not yet built.

## Setup on a new device (after `git pull` / `git clone`)

You need [Bun](https://bun.sh) and Node.js installed. The database is
MongoDB Atlas (cloud) — no local database install needed.

### 1. Backend

```
cd backend
bun install
cp .env.example .env
```

Edit `.env`:
- `MONGODB_URI` — get this from the Atlas dashboard (Database → Connect →
  Drivers → Node.js). Ask a project owner for the connection string, or see
  `.env.example` for the format and Windows TLS-troubleshooting notes.
- `JWT_SECRET` — any random string works per-device; it doesn't need to
  match other devices unless you want tokens to be portable between them.
  Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Then run it:
```
bun run dev
```
On first run it auto-seeds the database with demo users and jobs (only if
the `jobs` collection is empty — safe to run repeatedly). Demo login for any
seeded account: password `demo1234` (see `backend/shared/seed.js` for the
email list).

Should print:
```
MongoDB connected: scanwise
ScanWise backend listening on http://localhost:5000
```

### 2. Frontend

```
cd frontend
bun install
cp .env.example .env
bun run dev
```
Opens on `http://localhost:8080` (or the next free port if that's taken).

### 3. Verify

Visit the frontend, sign in with a seeded demo account (e.g.
`jordan@example.com` / `demo1234`), browse the "Open roles" list on the home
page, apply to one, and confirm it shows up under "My applications" — even
after a page refresh (proves it's hitting the real database, not mock data).

## Notes for whoever's setting this up

- The Atlas project's **Network Access** list must include `0.0.0.0/0`
  ("allow access from anywhere") — without it, only whichever IP was
  whitelisted at setup time can connect, which breaks this exact
  "works on any device" goal. Check under Atlas → Network Access → IP
  Access List.
- `.env` files are gitignored on purpose (they hold real credentials) — each
  device needs its own copy made from `.env.example`.
