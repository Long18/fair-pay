# Phase 5 — Scale (MVP scaffolding)

Roadmap for FairPay scale work beyond Phase 4 stickiness / monetization. This
document is planning-only for most items; code in this phase is limited to
stubs and light helpers unless noted.

**Out of scope for code now:** native iOS/Android apps, Electron desktop, Polar
checkout UI changes, SePay settle changes.

---

## 1. Multi-currency improvements

**Today:** VND is the product default. Formatting exists for several ISO codes
(`src/lib/format-utils.ts`); Agent API amounts are integer VND.

**Goals**
- Explicit supported-currency catalog and default (`VND`)
- Group/expense currency consistency rules
- Conversion / FX rates as a later concern (placeholder only in MVP)

**MVP scaffolding**
- `src/lib/currency/multi-currency-notes.ts` — catalog + conversion placeholder

**Later**
- Persist FX snapshots, settle in payer currency, multi-currency balances UI

---

## 2. Offline / PWA hardening

**Today:** Vite PWA plugin, service worker, online-status hook, WebLLM
IndexedDB cache. No durable offline write queue for expenses/settlements.

**Goals**
- Reliable install / update prompts
- Cache shell + critical read paths offline
- Queue mutations when offline; sync with conflict policy when online

**MVP scaffolding**
- Document intent only; no worker/queue code in this phase

**Later**
- Background sync, optimistic UI for drafts, offline-first balance views

---

## 3. Org accounts / SSO

**Today:** Individual Supabase Auth users; group membership; staff admin roles.
No first-class organization tenant or SSO IdP.

**Goals**
- Organization as billing/membership boundary
- Invite / role model beyond group admins
- SSO (SAML/OIDC) for enterprise tenants

**MVP scaffolding**
- Document intent only; no org/SSO schema in this phase

**Later**
- `organizations` + membership tables, SSO config, org-scoped Agent API tokens

---

## 4. Public API webhooks

**Today:** Public API v1 is poll-only. Changelog explicitly excludes outbound
webhooks.

**Goals**
- Users register HTTPS endpoints for event delivery
- Signed payloads (`secret`), event filter (`events text[]`), enable/disable

**MVP scaffolding**
- Table `public.public_api_webhooks` (or alias `agent_webhooks` in docs)
  - Columns: `id`, `user_id`, `url`, `secret`, `events`, `active`, `created_at`
  - RLS: owner CRUD only
- **No delivery worker yet** — registration storage only

**Later**
- Delivery worker, retries, delivery logs, HTTP CRUD under `/v1/webhooks`

---

## 5. Native apps (out of scope for code)

Native mobile (iOS/Android) and Electron desktop remain roadmap items only.
Continue investing in responsive web + PWA until a separate native program
starts. Do not add Electron or React Native shells in Phase 5 MVP.

---

## Status checklist

| Area | Scaffolding | Delivery |
|------|-------------|----------|
| Multi-currency notes util | Done (light) | TBD |
| Offline / PWA hardening | Doc only | TBD |
| Org accounts / SSO | Doc only | TBD |
| Public API webhooks table | Done | Delivery TBD |
| Native / Electron | Explicitly out of scope | — |
