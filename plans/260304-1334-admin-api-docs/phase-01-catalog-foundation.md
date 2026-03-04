# Phase 01 — Catalog Foundation

**Status**: ⏳ In Progress | **Priority**: Critical

## Context links
- Main plan: [plan.md](./plan.md)
- Admin types: `src/modules/admin/types.ts`
- Existing admin hook: `src/modules/admin/hooks/use-is-admin.ts`

## Key Insights
- 27 RPC functions actively called from `src/` frontend code — these are `used_in_code: true`
- 5 Vercel HTTP routes + 8 edge functions = 13 HTTP endpoints total
- SQL source parsing is static — no live DB connection needed (provenance tagging)
- Generator script runs at build time via `tsx` or `node --loader ts-node/esm`

## Implementation Steps

### Step 1.1 — `src/modules/admin/api-docs/types.ts`
Define all shared TypeScript types: `ApiKind`, `ApiAuthLevel`, `ApiRiskLevel`, `ApiEntryStatus`, `ApiCallability`, `ApiParamSpec`, `ApiCatalogEntry`, `ApiExecutionRequest`, `ApiExecutionResult`.

### Step 1.2 — `scripts/generate-api-catalog.ts`
Node.js/TypeScript script that:
1. Globs `api/**/*.{ts,tsx}` → extracts route path + methods
2. Globs `supabase/functions/*/index.ts` → extracts function name
3. Parses `supabase/migrations/*.sql` + `supabase/baseline.sql` + `supabase/scripts/sync/dumps/production-schema.sql` → extracts `CREATE.*FUNCTION` names
4. Globs `src/**/*.{ts,tsx}` → finds `.rpc("name")` patterns → marks `used_in_code: true`
5. Emits `catalog.generated.ts` with typed `ApiCatalogEntry[]`

### Step 1.3 — `src/modules/admin/api-docs/catalog.generated.ts`
Output of generator. Contains all discovered entries with:
- HTTP entries: 13 total (5 Vercel + 8 edge)
- RPC entries: ~142 discovered (27 `used_in_code: true`, rest `false`)

### Step 1.4 — `src/modules/admin/api-docs/catalog.overrides.ts`
Manual overlay. Starts nearly empty. Provides `Partial<ApiCatalogEntry>[]` keyed by `id`.

### Step 1.5 — `src/modules/admin/api-docs/catalog.ts`
Runtime merge: `generatedCatalog.map(e => ({ ...e, ...(overrides[e.id] ?? {}) }))`.
Exports `const catalog: ApiCatalogEntry[]`.

## Todo
- [x] Create types.ts
- [x] Create generator script
- [x] Run generator → catalog.generated.ts
- [x] Create catalog.overrides.ts
- [x] Create catalog.ts

## Risk Assessment
- SQL regex may miss edge-case function signatures → acceptable, status = `unverified`
- Large baseline.sql (~10k lines) — grep-based parsing is sufficient
