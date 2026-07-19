# Changelog — FairPay Public API

All notable changes to the FairPay Public API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The version recorded here tracks the **public API surface** (HTTP endpoints under
`/v1/`, request/response shapes, authentication, error codes). Internal
refactors that do not change the contract are not listed.

---

## [Unreleased]

### Added
- **Webhook endpoints (scaffold)** — Database table
  `public.public_api_webhooks` for registering outbound webhook URLs
  (`url`, `secret`, `events`, `active`). Owner-only RLS. No HTTP
  `/v1/webhooks` CRUD and **no delivery worker yet** (delivery TBD).
  See `docs/features/phase5-scale.md`.

### Changed
- _Nothing yet._

### Deprecated
- _Nothing yet._

### Removed
- _Nothing yet._

### Fixed
- _Nothing yet._

### Security
- _Nothing yet._

---

## [1.0.0] — 2026-06-23

First stable release of the FairPay Public API. From this version forward, the
`/v1/` path is covered by the stability guarantees in
[`docs/version-policy.md`](./version-policy.md).

### Added
- **Agent API v1** — REST endpoints under `/v1/` for programmatic access to
  agent operations (see `docs/openapi-agent-api-v1.yaml` for the full schema).
- **Authentication** — Bearer-token auth via Supabase-issued JWTs. Tokens are
  validated on every request and scoped to the caller's organization.
- **Authorization** — Row-level security (RLS) enforced at the database layer.
  All `/v1/` endpoints honor the same RLS policies as the web client; an agent
  token cannot read or write rows the underlying user could not.
- **Pagination** — Cursor-based pagination on list endpoints with `limit` and
  `cursor` query parameters, and `next_cursor` in the response envelope.
- **Error envelope** — Consistent `{ error: { code, message, details? } }`
  shape across all `/v1/` endpoints, with stable `code` strings safe to switch
  on.
- **Rate limiting** — Per-token rate limits with `X-RateLimit-Limit`,
  `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers on every response.
- **Idempotency** — `Idempotency-Key` header support on all mutating
  endpoints. Repeated requests with the same key within 24 hours return the
  original response.
- **Admin agent operations** — Internal admin endpoints (gated behind admin
  RLS) for inspecting and managing agent activity, backed by the RPCs in
  `supabase/migrations/20260623081229_admin_agent_operations_rpcs.sql`.
- **OpenAPI specification** — Machine-readable contract published at
  `docs/openapi-agent-api-v1.yaml` for client generation and validation.
- **Internal integration guide** — Onboarding and usage patterns documented in
  `docs/agent-api-internal-guide.md`.

### Security
- All endpoints require HTTPS; HTTP requests are redirected and logged.
- Bearer tokens are short-lived and rotated through the standard Supabase
  refresh flow; the API does not issue or store long-lived secrets on the
  client's behalf.
- Sensitive fields (PII, payment details) are never returned in error
  responses or log lines, even at debug verbosity.
- Database access goes through RLS-protected RPCs only; the API never issues
  raw SQL on behalf of a caller.
- CORS allow-lists are explicit per environment; wildcard origins are
  rejected in production.

### Not Included
The following are explicitly **out of scope** for v1 and should not be assumed
to work, even if a related path or field appears in the codebase:
- **Webhooks / push notifications** — No outbound webhook delivery. Clients
  must poll list endpoints. Webhook support is planned for a later minor
  version and will be additive.
- **Bulk import / export** — No bulk-create endpoints and no full-org export.
  Mutations are one resource per request.
- **GraphQL** — Only REST is supported. There is no GraphQL endpoint.
- **WebSocket / streaming** — No live subscriptions on `/v1/`. Real-time
  updates remain a Supabase-realtime concern on the web client only.
- **File uploads via the public API** — File and attachment uploads continue
  to go through the existing storage signed-URL flow, not through `/v1/`.
- **Cross-organization queries** — A token is always scoped to one org. There
  is no v1 endpoint that returns data across orgs, by design.
- **Custom role/permission management** — Role assignment remains an admin-UI
  concern; there is no v1 endpoint to mutate roles or RLS policies.

---

[Unreleased]: https://github.com/your-org/fair-pay/compare/api-v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/fair-pay/releases/tag/api-v1.0.0
