# Admin API Console (Swagger-like)

**Date**: 2026-03-04 | **Status**: In Progress | **Priority**: High

## Overview

New admin page `/admin/api-docs` — searchable, filterable catalog of all HTTP + RPC APIs with Swagger-like Try It Out interactivity, grounded in FairPay's existing admin architecture and design system.

## Discovered surfaces
- **HTTP (Vercel)**: 5 routes (`api/debt/all-users-detailed`, `api/debt/all-users-summary`, `api/debt/who-owes-who`, `api/og/expense`, `api/webhooks/momo`)
- **Edge Functions**: 8 (`ai-chat`, `all-users-debt-detailed`, `all-users-debt-summary`, `get-user-debt`, `process-recurring-expenses`, `send-email-notifications`, `sepay-create-order`, `sepay-webhook`)
- **RPC (frontend)**: 27 unique function names detected in `src/`
- **RPC (SQL sources)**: ~142 total across migrations/baseline/dump

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Types + Catalog Foundation | ⏳ In Progress | [phase-01](./phase-01-catalog-foundation.md) |
| 2 | UI Shell + i18n + Routing | 🔲 Pending | [phase-02](./phase-02-ui-shell.md) |
| 3 | Try It Out Engine + Proxy | 🔲 Pending | [phase-03](./phase-03-interactivity.md) |
| 4 | Feature Flag + Hardening | 🔲 Pending | [phase-04](./phase-04-hardening.md) |
| 5 | QA + Rollout | 🔲 Pending | [phase-05](./phase-05-qa.md) |

## Key file targets

```
src/modules/admin/api-docs/types.ts               # shared types
src/modules/admin/api-docs/catalog.generated.ts    # auto-generated (do not edit)
src/modules/admin/api-docs/catalog.overrides.ts    # manual metadata/examples
src/modules/admin/api-docs/catalog.ts              # merged runtime catalog
src/modules/admin/pages/AdminApiDocs.tsx           # main page
src/locales/en.json                                # add adminApiDocs namespace
src/locales/vi.json                                # add adminApiDocs namespace
api/admin/api-console/execute.ts                   # secure proxy endpoint
scripts/generate-api-catalog.ts                    # generator script
```
