# Utility Tariff Simulator

Saved, evidence-aware utility tariff and cash-flow planning scenarios, with an immutable Tagbilaran workbook-reference example.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/utility-tariff run dev` — run the frontend through its managed artifact workflow
- `pnpm --filter @workspace/api-server run initialize` — explicitly initialize the reference example once, using insert-on-conflict-do-nothing; never resets existing simulations
- `npm test` — deterministic engine benchmarks and modelling boundary checks
- `cd artifacts/api-server && node initialize.mjs --check-reports` — PDF/DOCX/CSV/JSON generation and private-storage round trips (creates and removes diagnostic files only)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/utility-tariff/src`: landing, eight-step editor, results, comparisons, sources and guide.
- `artifacts/api-server/src/lib/engine.ts`: pure reviewed/reference calculation methods; report exports and reference fixture initialization are separate modules.
- `lib/db/src/schema`: persistent simulations, revisions, observations, investments, runs, reports, evidence and Replit OIDC sessions.
- `lib/api-spec/openapi.yaml`: API contracts. Regenerate clients and validators after changes.
- `data/tagbilaran.seed.json`: reconstructed source-located primitive fixture; `data/workbook.expected.json` is test-only.
- `reference-package/`: original source files; do not move these into frontend public assets.
- `docs/SOURCE_RECONCILIATION.md`: package mismatch, source conflicts and modelling limits.

## Architecture decisions

- Missing is not zero; an unconfirmed investment program is not an assumed zero-cost program.
- Keep current snapshots and first-forecast-year averages separate; keep utility sales separate from city-wide demand.
- Never derive billings from collections or label cash/m³ as a tariff.
- The workbook reference is unvalidated, not a approved or recommended utility tariff.
- Database input revisions and frozen results prevent later edits from changing reports. App Storage holds evidence bytes and report exports privately; database rows retain ownership and provenance.

## Product

My simulations, blank creation, independent duplication, guided input review, source observations and evidence uploads, two calculation objectives, method comparison, immutable run history, stale-result warnings, and PDF/Word/CSV/JSON exports. Replit OIDC login is required for private saves, source downloads, uploads and exports.

## User preferences

Do not publish or expose supplied original files publicly without explicit authorization. The original Tagbilaran example is read-only; users must duplicate to edit. Start new simulations without pilot-specific assumptions.

## Gotchas

- No schema push or seed resets on application startup. Development schema updates and reference initialization are explicit commands.
- New databases need schema creation/migration and explicit reference initialization before serving the example.
- Replit-managed artifact workflows provide ports and routing; do not configure replacements.
- Authentication and private storage must remain enabled; do not bypass them for screenshots or tests.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
