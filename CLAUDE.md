# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`vela-core` is the shared schema/data-contract repo for [Vela](https://github.com/devdesiignn/vela) (Receipt Intelligence Platform). It defines the core entities (`stores`, `receipts`, `line_items`, `extraction_reviews`), the migrations that evolve that schema, and synthetic seed data — all consumed by other services in the platform, which may be written in different languages.

**Status: initial schema complete.** All 4 core tables are migrated, documented, seeded, and covered by automated tests (`npm test`). Local Postgres is provisioned via Docker Compose — see below for the full setup. Schema evolves via additive migrations after the initial 4 (e.g. constraints added later) — check `migrations/` for the current full list rather than assuming only 4 files exist.

## Local Postgres (dev)

`docker-compose.yml` runs Postgres 16 for local development. It reads `PGUSER`/`PGPASSWORD`/`PGDATABASE`/`PGPORT` from `.env` — Docker Compose auto-loads a file literally named `.env`, which is also the file dev migration/seed scripts load directly. One file, no sync step, no duplication.

- If Docker Desktop's engine isn't running yet, `npm run docker:start` (`node scripts/docker-start.js`) launches it and polls until it responds — an opt-in convenience, not chained into `bootstrap:dev`/`pretest`, since the Docker Desktop install path it uses (`scripts/docker-start.js`) is hardcoded to this machine and won't be portable elsewhere.
- Start (dev): `npm run docker:up` (`docker compose up -d --wait` — `--wait` blocks until the healthcheck passes, so Postgres is actually ready to accept connections before the command returns)
- Start against `.env.production` instead (only relevant if Postgres is ever self-hosted via Docker for prod — see below): `npm run docker:up:prod` (`docker compose --env-file .env.production up -d --wait`)
- Stop: `npm run docker:down` (`docker compose down`; data persists in the `vela_core_pgdata` volume — run `docker compose down -v` directly to also wipe the volume)
- Check status: `npm run docker:ps` (`docker compose ps`)
- Check the DB is accepting connections: `npm run db:ready` (`docker compose exec postgres pg_isready -U vela_core`)
- Open an interactive `psql` shell inside the container: `npm run db:psql` (`docker compose exec -it postgres psql -U vela_core -d vela_core_dev`)

Connects on `localhost:1111` (mapped to the container's default 5432), user/db `vela_core` / `vela_core_dev`. Closing the Docker Desktop window does not stop the container — only fully quitting Docker Desktop or running `docker compose down` does.

## Environment files

- `.env` — real local dev credentials, read directly by both Docker Compose and the `migrate:dev*`/`db:seed:dev` npm scripts (gitignored).
- `.env.example` — committed template mirroring `.env`'s shape, with safe placeholder values.
- `.env.production` — placeholder structure only; real prod credentials are never committed (gitignored). Not tied to Docker Compose by default — prod is expected to be a database this repo connects _to_ (hosted provider or a separately-managed server), not one this repo's compose file provisions. If Postgres is ever self-hosted via Docker for prod, point Compose at it explicitly with `--env-file .env.production` (see `docker:up:prod` above) rather than relying on the `.env` default.
- `.gitignore` uses `.env`/`.env.*` to ignore all real env files, with an explicit `!.env.example` exception so the template stays tracked.
- Each npm script loads its env file explicitly via `dotenv-cli` (e.g. `dotenv -e .env -- ...`, `dotenv -e .env.production -- ...`) rather than relying on `NODE_ENV`-based auto-detection — this keeps it unambiguous which file a given command uses, and avoids depending on a Node version supporting the native `--env-file` flag.

## Migrations (node-pg-migrate)

Config lives in `.node-pg-migraterc` — migration files go in `migrations/` (created on first use), written as `.js` with paired `up`/`down` exports.

npm scripts:

- `npm run migrate:create <name>` — scaffold a new timestamped migration file (env-agnostic).
- `npm run migrate:dev` / `npm run migrate:dev:down` — apply/revert migrations against `.env`.
- `npm run migrate:prod` / `npm run migrate:prod:down` — same, against `.env.production`.
- `npm run db:seed:dev` — runs `seeds/run.js` against `.env`; seeding is dev-only, no prod seed script.
- `npm run bootstrap:dev` — `docker:up` → `migrate:dev` → `db:seed:dev`, chained. The one command to go from nothing to a fully migrated, seeded local database.
- `npm run bootstrap:prod` — `docker:up:prod` → `migrate:prod` (no seed step — seeding is dev-only). Only relevant if Postgres is self-hosted via Docker for prod.

## Seed data (`seeds/`)

- `seeds/fixed.js` — hand-written, predictable records covering specific known cases: a receipt with every optional field filled, one with only required fields, the per-register VAT case, and each `extraction_reviews` case (field-level, line-item-level `"line_item"` sentinel, missing-item `"missing_line_item"` sentinel, and a multi-extractor conflict).
- `seeds/random.js` — randomly generated records via `@faker-js/faker`, layered on top for volume/variety. Not deterministic — re-running produces different (but still valid) rows.
- `seeds/run.js` — the entry point `db:seed:dev` calls. **Truncates all 4 tables first** (`TRUNCATE ... CASCADE`), then runs `seedFixed` + `seedRandom` inside one transaction — safe to re-run any number of times, since it always resets to a clean state before inserting.

## Tests (`tests/`)

- `tests/schema.test.js` — verifies migrations produced the expected structure: all 4 tables exist, the unique index on `receipts.content_hash` exists, both enums (`flagged_reason_type`, `review_status_type`) exist with the expected values.
- `tests/seed.test.js` — verifies the seeded data is internally consistent: rows present in every table, every FK actually resolves (receipts→stores, line_items→receipts, extraction_reviews→receipts and →line_items), no duplicate `content_hash`, no `extraction_reviews.status` outside the known enum values.
- `npm test` is self-sufficient — its `pretest` script runs `bootstrap:dev` automatically before the tests run, so a single `npm test` is enough with no manual setup.

## Data contract (`schemas/`)

One JSON Schema file per table, matching the migrations 1:1: `store.schema.json`, `receipt.schema.json`, `line_item.schema.json`, `extraction_review.schema.json`. `receipt.schema.json` references `line_item.schema.json` via `$ref` rather than embedding it. These are what other (possibly non-Node) services in the platform validate against — not the migration files, which are internal to this repo only.

## Docs (`docs/`)

- `SCHEMA.md` — the "why" behind the schema: field tiers (required/common/rare), the `extraction_reviews` design (sentinel `field_name` values, multi-extractor conflict handling, `flagged_reason` vs `status`).
- `DECISIONS.md` — the broader engineering decision log: tooling choices (node-pg-migrate vs Prisma, UUID vs serial, env file structure), not just schema reasoning. Read this before revisiting any "why did we do it this way" question rather than re-deriving it.

## Linting & formatting

- `npm run lint` — ESLint (`eslint.config.js`, flat config).
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`).
- A husky pre-commit hook (`.husky/pre-commit`) runs `lint-staged` automatically on every commit, which lints/formats staged `.js` files and formats staged `.json`/`.md`/`.yml`/`.yaml` files. `prepare` (auto-run by `npm install`) wires up husky's git hooks.

## Scope boundaries (from README)

This repo does **not**:

- Run a server or expose an API.
- Process or extract data from receipt images.
- Assume every consuming service is written in the same language.

Keep contributions limited to schema, migrations, the data contract, and synthetic seed data — application/service logic belongs in the other repos under Vela.

## Commit conventions

- Do not add a `Co-Authored-By: Claude` trailer to commit messages in this repo.
- Use Conventional Commits: `type(scope): message` (e.g. `feat(schema): add line_items table`, `chore(migrations): reorder seed step`, `fix(seeds): correct store id reference`). Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`. Scope is the affected domain (`schema`, `migrations`, `seeds`, `db`, etc.) and is optional but preferred when a change is domain-specific.
