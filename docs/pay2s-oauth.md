# Pay2S OAuth (optional bank sync)

Lets a user link their Pay2S account so FairPay receives incoming bank transfers by webhook and **suggests** which payment request they settle. Manual bank/MoMo entry keeps working; this is an add-on.

**FairPay never settles automatically from this feature.** Webhooks only record transactions and flag suggested matches; confirmation stays in the FairPay UI (see [`AGENTS.md`](../AGENTS.md)).

Upstream docs: <https://developer.pay2s.vn/docs/oauth/overview/>

## Architecture

```
Browser ──POST──▶ pay2s-oauth-start      (JWT)  stores state + PKCE verifier, returns authorize URL
Browser ──302──▶  Pay2S consent
Pay2S  ──302──▶   pay2s-oauth-callback   (no JWT; user = one-time state)  token exchange → bank → webhook
Pay2S  ──POST──▶  pay2s-webhook?c=<id>   (HMAC)  record tx, suggest match, ACK {"success":true}
Browser ──POST──▶ pay2s-disconnect       (JWT)  delete webhook, revoke, wipe secrets
```

| Piece | Path |
|-------|------|
| Migration / rollback | `supabase/migrations/20261112090000_pay2s_oauth.sql`, `supabase/rollbacks/…_ROLLBACK.sql` |
| Pure helpers (PKCE, AES-GCM, HMAC, parsing, REST client) | `supabase/functions/_shared/pay2s.ts` |
| Env + token manager (refresh lease) | `supabase/functions/_shared/pay2s-server.ts` |
| Edge Functions | `supabase/functions/pay2s-{oauth-start,oauth-callback,webhook,disconnect}/` |
| UI | `/settings/pay2s` → `src/modules/settings/{pages,components}/pay2s-settings.tsx`, hook `src/hooks/payment/use-pay2s-connection.ts` |
| Tests | `supabase/functions/_shared/pay2s.test.ts`, `tests/integration/pay2s-edge-functions.test.ts`, `tests/hooks/use-pay2s-connection.test.ts` |

### Data model

- `pay2s_connections` — client-readable status only (RLS: owner `SELECT`; writes via service role).
- `pay2s_connection_secrets` — AES-GCM encrypted access/refresh tokens + webhook signing secret. **No client access.**
- `pay2s_oauth_states` — hashed `state` + encrypted PKCE verifier, 10-minute TTL, single use. **No client access.**
- `pay2s_bank_transactions` — webhook records; `UNIQUE (connection_id, pay2s_tx_id)` is the idempotency key. Owner `SELECT`; dismiss via `dismiss_pay2s_transaction()`.

### Behaviours that matter

- **Refresh tokens rotate and reuse revokes the connection.** `getValidAccessToken()` takes a per-connection lease (`pay2s_try_acquire_refresh_lease`), saves both new tokens in one write, and never retries blindly after an unknown outcome. Refresh is lazy; webhooks do not depend on the access token.
- Access token ≈ 15 min, refresh ≈ 30 days, connection ≤ 90 days. The UI warns 7 days before expiry and when status is `expired`/`error`.
- Webhook ACK happens only **after** the row is stored; a storage failure returns 500 so Pay2S retries.
- Reconnect deletes the old webhook and uses a fresh `request_key` (a replayed key returns no signing secret).
- Webhook verification: HMAC-SHA256 over `timestamp + "." + rawBody`, constant-time compare, ±5 min window.

## Setup (needs real credentials)

1. In the Pay2S developer portal create an app. An app has exactly **one HTTPS callback, no wildcards**; scopes/callback can't be edited later. Use separate apps for dev and prod.
   - **Personal app**: usable immediately but only by the owner's Pay2S account (good for dev).
   - **Partner app**: required for other FairPay users; needs Pay2S review (`draft → pending → approved`).
2. Callback URL: `https://<project-ref>.supabase.co/functions/v1/pay2s-oauth-callback`.
3. Scopes requested: `profile:read accounts:read transactions:read webhooks:read webhooks:write webhooks:delete`.
4. Set Supabase function secrets (see [`pay2s.env.example`](../pay2s.env.example)): `PAY2S_CLIENT_ID`, `PAY2S_CLIENT_SECRET`, `PAY2S_REDIRECT_URI`, `PAY2S_TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`), `APP_URL`.
5. Apply the migration (new migration only; never edit applied history, no prod `db:push` without approval).
6. Deploy functions; `supabase/config.toml` already marks `pay2s-oauth-callback` and `pay2s-webhook` as `verify_jwt = false`.

## Local verification (no credentials)

```bash
pnpm exec vitest run supabase/functions/_shared/pay2s.test.ts \
  tests/integration/pay2s-edge-functions.test.ts \
  tests/hooks/use-pay2s-connection.test.ts
pnpm type-check
```

The integration test runs the real Edge Function handlers against an in-memory Supabase (`tests/mocks/fake-supabase.ts`) and a mocked Pay2S API. The real OAuth round trip needs HTTPS and a registered app, so it can't run on `http://localhost`; test it against a hosted Supabase project.

## Open items to confirm against a live account

- The OAuth webhook auth scheme (HMAC headers vs Bearer) and whether the receiver must return `{"success":true}`; the code uses HMAC and ACKs `{"success":true}`.
- The exact `/revoke` path (`pay2s.ts` uses `${base}/revoke`); see <https://developer.pay2s.vn/docs/oauth/revoke/>.
- Numeric rate limits and the webhook retry schedule (not published).
- v1 links the **first** granted bank; selecting among several is future work.
