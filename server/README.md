# snatty-api (Phase 1)

Fastify + Prisma + PostgreSQL. Auth is JWT-based (`Authorization: Bearer`) — see `docs/auth-token-strategy.md`.

## Prerequisites

- Node 20+
- Docker (for Postgres / Redis)

## Setup

```bash
cd server
cp .env.example .env
docker compose up -d
npm install
npx prisma generate
npx prisma db push
npm run dev
```

- Health: [http://localhost:4000/health](http://localhost:4000/health)
- DB health: [http://localhost:4000/health/db](http://localhost:4000/health/db)

## Example: sign up and get a token

```bash
curl -sS -X POST http://localhost:4000/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"correct-horse-1"}'
# → { "user": {...}, "accessToken": "...", "refreshToken": "..." }
```

## Example: quick entry (widget/share contract)

```bash
curl -sS -X POST http://localhost:4000/v1/entries/quick \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"body":"hello","emotionTagIds":[],"source":"widget"}'
```

## Example: soft-delete an entry

```bash
curl -sS -X DELETE http://localhost:4000/v1/entries/<entry-id> \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Sets `JournalEntry.deleted = true` only — `body` is never touched (append-only policy). Idempotent: calling again on an already-deleted entry still returns 200. Returns 404 if the entry doesn't exist or belongs to a different user (no existence leak).

## Example: reminder spec + push token

See [docs/first-launch.md § 06](../docs/first-launch.md#06-푸시리마인더).

## Testing

```bash
npm test
```

Route logic (auth, ownership, idempotency) is covered in `src/app.test.ts` against an in-memory Prisma double — no live Postgres needed. `src/app.ts` exports `buildApp()` (routes only, no `listen()`) so tests can `inject()` requests directly; `src/index.ts` is just the production bootstrap (safety guard + `listen()`).

## Database backups

Real user credentials and journal entries live here now, so this isn't optional.

```bash
npm run db:backup            # pg_dump to ./backups (gitignored), keeps last 14 by default
npm run db:restore -- ./backups/snatty-db-<timestamp>.dump
```

- Requires `pg_dump`/`pg_restore` on the machine running the script (`brew install libpq` on macOS, `apt install postgresql-client` on Debian/Ubuntu). Reads `DATABASE_URL` from `.env` if not already set in the environment.
- **`pg_dump`'s version must be ≥ the target server's major version, or it refuses to run** (`pg_dump: error: aborting because of server version mismatch`). Confirmed 2026-09-06: our Neon instance runs Postgres 18, so `pg_dump`/`pg_restore` 16.x (e.g. the `postgres:16-alpine` image) fails against it — use a 18.x client. Check server version with `psql "$DATABASE_URL" -c 'select version();'` if backups start failing after a Neon upgrade.
- **Neon does not back up the free-tier Postgres by default** — this is a separate, independent safety net regardless of plan. Confirm in the Neon dashboard whether your plan includes point-in-time recovery/automated snapshots; if it does, treat `db:backup` as a second line of defense, not a replacement.
- Not yet automated — running it is a manual step. To automate: a scheduled GitHub Action (`schedule:` cron trigger) calling this script against the production `DATABASE_URL` is the lowest-effort option. Not wired up yet.
- `./backups/` is gitignored — dumps contain real user data and must never be committed.
- **Restore rehearsal (2026-09-06)**: ran the real `backup-db.sh`/`restore-db.sh` end-to-end against an isolated local Postgres (seed data → backup → wipe the DB entirely → restore → confirmed every row came back byte-for-byte, including a soft-deleted entry's `deleted` flag) — not against the live Neon DB, to avoid any production risk. Separately confirmed `backup-db.sh` itself succeeds against the actual production `DATABASE_URL` (read-only `pg_dump`, immediately deleted the output). See `docs/PROGRESS_CHECKLIST.md` § DATA-INTEGRITY for the full write-up.

## Connecting the Next.js frontend

With `snatty-api` running, create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SNATTY_API_URL=http://127.0.0.1:4000
NEXT_PUBLIC_DEV_EMAIL=you@example.com
```

On **기록 저장하기**, the app writes to `localStorage` first, then sends the same content to `POST /v1/entries/quick`. Leave the URL unset to stay local-only (see `.env.example` and [docs/PROGRESS_CHECKLIST.md § 부록 A](../docs/PROGRESS_CHECKLIST.md#부록-a--저장-흐름-병목-auth-근거) for the full save flow).
