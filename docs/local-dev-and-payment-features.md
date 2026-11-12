# Local development and payment features

Concise reference for FairPay’s local Supabase bootstrap, schema drift policy, MoMo receive settings, manual payment claims, and shared payment UI patterns.

## Local database bootstrap

**Command:** `pnpm db:local:bootstrap` ([`scripts/local-db-bootstrap.sh`](../scripts/local-db-bootstrap.sh))

**Order (do not skip steps):**

1. `supabase start`
2. `supabase db reset --no-seed` with `[db.migrations] enabled = false` in `config.toml` (clean Postgres without mid-chain migration failures)
3. Apply [`supabase/baseline.sql`](../supabase/baseline.sql) (core DDL; migration history assumes baseline exists)
4. Apply [`supabase/scripts/local/ensure-baseline-gaps.sql`](../supabase/scripts/local/ensure-baseline-gaps.sql) (local-only gap fill)
5. `supabase migration up` (incremental migrations on top of baseline)
6. Seeds from `supabase/config.toml`
7. Verify `public.profiles` and `public.expenses`

**App env:** copy URL and anon key from `pnpm supabase:status` into `.env.local`:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
```

Do **not** use `pnpm supabase db reset` alone — it does not apply `baseline.sql`, so core tables may be missing.

## Remote migration drift

Production schema is driven only by **new** files under [`supabase/migrations/`](../supabase/migrations/). See [`docs/baseline-drift-process.md`](./baseline-drift-process.md).

- Agents default to **remote** Supabase; local bootstrap is optional/advanced.
- If remote `migration list` shows versions not applied locally, **do not** repair production history or rewrite applied migrations without explicit human approval.
- Idempotent fixes in existing migration files target **local re-runs** after baseline-first bootstrap; they are not a substitute for `db push` to prod.

## MoMo receive settings (`momo_info`)

**Migration:** `20261108103000_add_momo_info_to_user_settings.sql` — adds `user_settings.momo_info` (JSON) alongside `bank_info`.

**UI:** Settings → MoMo receive (`/settings/momo`), shared patterns with VietQR bank settings (split forms: [`momo-bank-settings-form`](../src/modules/settings/components/momo-bank-settings-form.tsx), [`vietqr-bank-settings-form`](../src/modules/settings/components/vietqr-bank-settings-form.tsx)).

**`schemaNotReady`:** When PostgREST reports a missing column (migration not applied), hooks surface a guarded state and the form shows `settings.bank.momo.schemaNotReady` instead of failing silently. Helper: [`src/lib/supabase/postgrest-errors.ts`](../src/lib/supabase/postgrest-errors.ts).

## Manual MoMo payment claim

**Migration:** `20261108120000_momo_manual_payment_claim.sql` — RPC for payer to assert “I have paid” on a debt (manual MoMo flow, not Sepay checkout).

**Client:** [`use-momo-manual-payment-claim`](../src/hooks/payment/use-momo-manual-payment-claim.ts), [`momo-manual-payment-dialog`](../src/modules/payments/components/momo-manual-payment-dialog.tsx).

**Notifications:** New notification type for payee; routing in [`notification-navigation`](../src/modules/notifications/utils/notification-navigation.ts); journey event allowlist updated in [`allowed-events.ts`](../src/lib/journey-tracking/allowed-events.ts).

Confirmation of settlement remains in FairPay UI; agent/MCP surfaces must not expose confirm/settle tools.

## Payment UI patterns

- **Shared row:** [`payment-method-menu-item.tsx`](../src/modules/payments/components/payment-method-menu-item.tsx) — icon, label, optional badge; used in dropdown and bottom sheets.
- **Method picker:** [`payment-method-dropdown.tsx`](../src/modules/payments/components/payment-method-dropdown.tsx) — composes menu items; avoid nested Radix `DropdownMenuTrigger` inside another trigger (use `asChild` on a single native/button trigger).
- **Dialogs:** VietQR, Sepay, MoMo manual — open from debt breakdown / person debt views; payee methods from [`use-payee-online-payment-methods`](../src/hooks/payment/use-payee-online-payment-methods.ts).

## Dev preview env vars

Add to `.env.local` only (see [`.env.example`](../.env.example)):

| Variable | Purpose |
|----------|---------|
| `VITE_BANK_SETTINGS_PREVIEW` | When not `false` in dev, empty `bank_info`/`momo_info` can use sample values |
| `VITE_BANK_PREVIEW_*` | VietQR bank code, account, holder name, optional QR image URL |
| `VITE_BANK_PREVIEW_MOMO_*` | MoMo phone, display name, optional QR URL |
| `VITE_DONATION_WIDGET_PREVIEW` | Force donation widget preview without DB row |

Preview helpers: [`src/lib/bank/dev-preview-bank-settings.ts`](../src/lib/bank/dev-preview-bank-settings.ts).

## Testing checklist

**Bootstrap**

```bash
pnpm db:local:bootstrap
pnpm supabase:status   # keys → .env.local
pnpm dev
```

**Vitest (scoped)**

```bash
pnpm exec vitest run tests/lib/bank-dev-preview.test.ts
pnpm exec vitest run tests/components/bank-settings-gating.test.tsx
pnpm exec vitest run tests/hooks/use-momo-manual-payment-claim.test.ts
pnpm exec vitest run src/hooks/payment/use-payee-online-payment-methods.test.ts
```

**Manual E2E**

1. Payee: save MoMo receive settings (or enable bank preview env).
2. Payer: open person debt breakdown → choose MoMo → scan/copy → **I have paid**.
3. Payee: notification opens debt/context; confirm settlement in UI (not via agent).

**Type-check**

```bash
pnpm type-check
```

## Related docs

- [`docs/pay2s-oauth.md`](./pay2s-oauth.md) — optional Pay2S OAuth bank sync (suggested matches only)
- [`AGENTS.md`](../AGENTS.md) — agent runbook and guardrails
- [`.mcp.README.md`](../.mcp.README.md) — MCP vs local DB
- [`docs/baseline-drift-process.md`](./baseline-drift-process.md) — baseline vs migrations
