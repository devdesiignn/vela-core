# vela-core

Shared schema, migrations, and data model for [Vela](https://github.com/devdesiignn/vela) (Receipt Intelligence Platform) — the contract every other service in the set depends on.

## What lives here

- The database schema for the core entities: `stores`, `receipts`, `line_items`, `extraction_reviews`.
- Migrations that create and evolve that schema.
- A data contract (schema definitions) that other services read to build their own native types, independent of what language they're written in.
- Synthetic/seed data for local development and testing, matching the real schema's shape without containing any real receipt data.

## What this does not do

- Does not run a server or expose an API.
- Does not process or extract data from receipt images.
- Does not assume every consuming service is written in the same language.

## Getting started

Requires Docker and Node.js.

```bash
npm install
npm run bootstrap:dev  # start local Postgres, apply migrations, load synthetic seed data
npm test                # verify schema + seed integrity
```

`npm test` runs `bootstrap:dev` automatically if it hasn't been run yet, so `npm install && npm test` is enough to go from a clean checkout to a fully migrated, seeded, and verified local database.

See [CLAUDE.md](./CLAUDE.md) for the full command reference, [docs/SCHEMA.md](./docs/SCHEMA.md) for a column-by-column walkthrough of every table, and [docs/DECISIONS.md](./docs/DECISIONS.md) for the reasoning behind the non-obvious choices.

## Status

Initial schema complete: all four core tables are migrated, documented, seeded with synthetic data, and covered by automated tests.

## Related repos

Part of [Vela](https://github.com/devdesiignn/vela) (Receipt Intelligence Platform).
