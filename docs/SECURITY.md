# FairPay Security Architecture

## Authentication Model

FairPay uses Supabase Auth with JWT Bearer tokens. Sessions are stored in `localStorage` (not cookies).

### CSRF Threat Model

The application is **inherently resistant to CSRF** because:
1. All API calls use `Authorization: Bearer <token>` headers
2. Tokens are stored in `localStorage`, not cookies
3. Browsers cannot auto-attach Authorization headers cross-origin
4. No HTML form submissions with `action` attributes exist — all forms use React state

**Remaining surface**: OAuth callback hijacking. Mitigated by Supabase's PKCE implementation (enabled by default since Supabase Auth v2).

### If introducing cookies in the future:
- All cookies MUST have `SameSite=Strict` and `Secure` flags
- Use `__Host-` prefix for sensitive cookies
- Implement Double Submit Cookie pattern for any cookie-based auth

## Content Security Policy

CSP is deployed in Report-Only mode during the migration period.
Target policy removes `unsafe-inline` and `unsafe-eval`.
Violations are logged to `/api/csp-report`.

## Admin Access Control

Admin endpoints are protected at two layers:
1. HTTP layer: `api/_lib/admin-auth.ts` validates admin role before processing
2. Database layer: RLS policies and RPC functions verify admin access

## PR Review Checklist — Security

Before merging, verify:
- [ ] Does this PR introduce cookies? → Add `SameSite=Strict; Secure` flags
- [ ] Does this PR add form `action` attributes? → Add CSRF analysis
- [ ] Does this PR add inline scripts/styles? → Check CSP compliance
- [ ] Does this PR add a new Supabase table? → Verify RLS is enabled
- [ ] Does this PR add a new Edge Function? → Use shared `_shared/cors.ts` helper
- [ ] Does this PR add analytics/tracking? → Gate behind consent check
- [ ] Does this PR expose user data? → Verify admin auth is applied
