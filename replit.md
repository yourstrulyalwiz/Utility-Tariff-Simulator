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

- `artifacts/utility-tariff/src`: landing, three-section interactive POC, reviewed-scenario compatibility, saved results, comparisons, sources and guide.
- `artifacts/api-server/src/lib/interactive.ts`: shared pure workbook components and POC baseline/intervention calculations.
- `artifacts/api-server/src/lib/preview.ts`: non-persisting draft preview and demo-only initialization; never seeds or updates a database.
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

My simulations, blank creation, independent duplication, Setup / Tariff simulator / Operational improvements, live non-persisting previews, immutable run history, and legacy frozen-report exports. Replit OIDC login is required for private saves, source downloads, uploads and exports. Existing reviewed-method financing scenarios remain separate and are never silently converted into workbook POC scenarios.

## Interactive POC modelling rules

- The user-authorized 80% collection calibration is an editable illustrative assumption. Its implied billings and average rate are not observed historical facts; never write them into observed billings or currentTariff.
- Keep workbook city/provider volume separate from utility billed sales. The large difference between reproduced workbook tariff and the collection-adjusted target tariff is intentional, not an error to hide.
- Each year uses its own calculated workbook OPEX. NRW affects variable costs only; O&M savings apply to the remaining costs. Collections efficiency affects receipts, not the cost-based workbook tariff.
- Intervention previews always start from the same unadjusted draft, not previous output. Preview does not save; frozen runs must use the same calculation as preview.
- The flat-demand Tagbilaran defaults are demo-only, labelled estimates. Do not initialize unrelated utilities with pilot facts or overwrite an explicit missing input.
- This POC is grant-only and does not add financing redesign, attribution waterfalls or report redesign. Existing reports are base frozen calculations, not exports of the live intervention view.

## User preferences

Do not publish or expose supplied original files publicly without explicit authorization. The original Tagbilaran example is read-only; users must duplicate to edit. Start new simulations without pilot-specific assumptions.

## Gotchas

- No schema push or seed resets on application startup. Development schema updates and reference initialization are explicit commands.
- New databases need schema creation/migration and explicit reference initialization before serving the example.
- Replit-managed artifact workflows provide ports and routing; do not configure replacements.
- Authentication and private storage must remain enabled; do not bypass them for screenshots or tests.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
