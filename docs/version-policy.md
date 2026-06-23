# FairPay Public API — Version Policy

This document describes how the FairPay Public API is versioned, how breaking
changes are managed, what stability you can rely on, and how we support
integrators. It applies to every endpoint under `/v1/` and to any future
major-version path (`/v2/`, `/v3/`, ...).

For the per-release history, see
[`CHANGELOG-PUBLIC-API.md`](./CHANGELOG-PUBLIC-API.md).

---

## 1. Versioning scheme

The API follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html):
**`MAJOR.MINOR.PATCH`**.

| Segment | Meaning | Example trigger |
|---|---|---|
| **MAJOR** | Backwards-incompatible change to the public contract. | Removing a field, renaming a field, changing a field's type, removing an endpoint, tightening a previously-permissive validation rule, changing an HTTP status code for an existing case. |
| **MINOR** | Backwards-compatible feature addition. | New endpoint, new optional request field, new optional response field, new error `code` value, new query parameter with a safe default. |
| **PATCH** | Backwards-compatible fix. | Bug fix that aligns behavior with documented contract, performance improvement, internal refactor with no observable change, documentation correction. |

The version reported by the API is the SemVer of the **contract**, not of the
deployed binary. Two deploys can ship under the same SemVer if they are
contract-identical.

The current contract version is reported in:
- `GET /v1/version` response body (`{ "version": "1.0.0" }`)
- The `info.version` field of `docs/openapi-agent-api-v1.yaml`
- The most recent `[x.y.z]` entry in
  [`CHANGELOG-PUBLIC-API.md`](./CHANGELOG-PUBLIC-API.md).

---

## 2. API path versioning

The major version lives in the **URL path**, not in a header.

```
https://api.fairpay.example/v1/agents/operations
                            ^^
                            major version
```

### Lifecycle of a major version

| Phase | Duration | What it means |
|---|---|---|
| **Active** | At least **12 months** from GA | New minor versions land here. Bug fixes and additive changes only. |
| **Deprecated** | At least **6 months** before removal | The next major version is GA; `/vN/` still works but every response includes a `Deprecation` and `Sunset` header. New integrations should target `/v(N+1)/`. |
| **Removed** | After the deprecation window closes | Requests return `410 Gone` with a body pointing at the migration guide. |

Concretely: when `/v2/` ships, `/v1/` will continue to work for **at least 12
months from its GA date** *and* for **at least 6 months from the day `/v2/`
becomes GA**, whichever is longer. We will not remove a major version with
less than six months' notice.

### When we cut a new major version

We cut a new `/vN/` only when a change cannot be expressed additively. We
prefer additive minor changes whenever they are technically viable, even if
the resulting shape is a little less elegant — stability beats aesthetics.

---

## 3. Deprecation policy

A field, parameter, endpoint, or behavior is **deprecated** before it is
removed. Deprecation never happens silently.

When something is deprecated:
1. The next minor release marks it deprecated in
   [`CHANGELOG-PUBLIC-API.md`](./CHANGELOG-PUBLIC-API.md) under a `Deprecated`
   subsection.
2. The OpenAPI spec adds `deprecated: true` to the affected schema element.
3. Responses that exercise the deprecated path include a `Deprecation: true`
   header, and where applicable a `Sunset: <RFC 7231 date>` header pointing
   at the earliest removal date.
4. A migration note is added explaining the recommended replacement.

The minimum deprecation window before removal is **6 months**. For widely
used surfaces we extend this — we do not shorten it. Removal itself is a
MAJOR version bump (the deprecated surface lives on in the older `/vN/` for
its own deprecation window).

---

## 4. Stability guarantee

Within a single major version (e.g. across all `1.x.y` releases), the
following guarantees hold:

### Will not change
- **Required response fields will not disappear.** A field documented as
  required in `1.0.0` will still be present and non-null in every `1.x.y`
  response for the same endpoint.
- **Field types will not change.** A `string` stays a `string`; an `integer`
  stays an `integer`; a date stays an ISO-8601 date in the same timezone
  convention.
- **Error `code` values are stable.** Once shipped, an error code's meaning
  is frozen. New error cases get new codes; existing codes are not
  repurposed.
- **HTTP status codes for documented cases are stable.** A documented `404`
  case will not become a `200` with an empty body, and vice versa.
- **Authentication and authorization semantics are stable.** A token that is
  authorized for an action in `1.0.0` remains authorized for that action
  through the `1.x` line.
- **Pagination contract is stable.** Cursor format is opaque; we will not
  require clients to parse it.

### May change additively
- **New optional response fields may appear** at any minor version. Clients
  must ignore unknown fields rather than fail on them. This is the single
  most important client-side rule for staying compatible.
- **New optional request parameters may be added** with safe defaults. Not
  sending them preserves existing behavior.
- **New endpoints may be added.**
- **New `code` values may appear** in error responses for genuinely new
  error cases. Clients should default-handle unknown codes.
- **Performance characteristics** (latency, payload size within reason) are
  not part of the contract and may improve or regress between minor and
  patch releases. SLA targets in §5 still apply.

### Out of scope for this guarantee
- Anything under a path *other than* `/v1/` (admin UI endpoints, internal
  RPCs, Supabase-direct queries) is not covered. Only the documented public
  API surface is.
- Undocumented fields that happen to appear in a response are not part of
  the contract and may be removed or renamed without notice. If you depend
  on a field, confirm it is in `docs/openapi-agent-api-v1.yaml`.

---

## 5. Service level agreement

These targets apply to the production deployment of `/v1/`.

| Metric | Target |
|---|---|
| **Uptime** | **99.9%** monthly availability, measured as successful response to authenticated `GET /v1/health` from outside our infrastructure. Equivalent to ~43 min of allowed downtime per 30-day month. |
| **Critical bug response** | First human acknowledgement within **24 hours**, 7 days a week. A "critical bug" is data corruption, data loss, a privacy/security regression, or an outage of an entire endpoint family. |
| **Non-critical bug response** | First human acknowledgement within **3 business days**. |
| **Feature request response** | First human acknowledgement within **7 days**, including a triage decision (accepted, declined, deferred). |
| **Security disclosure** | Acknowledgement within **24 hours**, fix or mitigation plan within **7 days** for confirmed high-severity issues. |

"Response" means a human reply with a tracking ID and next step — not an
auto-reply. Resolution time depends on severity and is not part of the SLA;
we report it case by case.

Planned maintenance is announced at least 72 hours in advance and does not
count against the uptime target when it falls within an announced window of
≤ 30 minutes per calendar month.

---

## 6. Support channels

| Channel | Use for | Where |
|---|---|---|
| **GitHub Issues** | Bug reports, feature requests, documentation gaps. Public, searchable. | `https://github.com/your-org/fair-pay/issues` |
| **Security disclosures** | Vulnerabilities, suspected data exposure. Do **not** open a public issue. | `security@fairpay.example` (PGP key in repo root). |
| **Integrator email** | Account-specific questions, auth setup, RLS questions that require sharing private context. | `api-support@fairpay.example` |
| **Status page** | Live incident updates, planned maintenance, historical uptime. | `https://status.fairpay.example` |
| **Changelog** | What changed and when. | [`docs/CHANGELOG-PUBLIC-API.md`](./CHANGELOG-PUBLIC-API.md) |
| **OpenAPI spec** | Source of truth for endpoints, schemas, and validation. | [`docs/openapi-agent-api-v1.yaml`](./openapi-agent-api-v1.yaml) |
| **Internal integration guide** | Patterns and worked examples for FairPay teams. | [`docs/agent-api-internal-guide.md`](./agent-api-internal-guide.md) |

When filing an issue, include: the API version (`/v1/`), the contract
version from `GET /v1/version`, the request `Idempotency-Key` if one was
sent, the response `X-Request-Id` header, and a minimal repro. That set is
enough for us to find the request in logs without further round-trips.

---

## 7. Summary for integrators

If you remember three things:

1. **Pin to a major version in the URL** (`/v1/`). Don't strip it, don't
   parameterize it.
2. **Ignore unknown response fields.** New optional fields show up in minor
   releases and we will not bump major just because your client crashed on
   one.
3. **Watch the `Deprecation` and `Sunset` headers.** They are your 6-month
   warning that something needs to move.
