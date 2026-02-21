# Research 01 — Auth Flow Analysis

**Date:** 2026-02-21
**Scope:** End-to-end email sign-in/sign-up flow audit

---

## Files Audited

| File | Role |
|------|------|
| `src/authProvider.ts` | Refine auth adapter — login, register, forgotPassword, updatePassword, check, getIdentity |
| `src/components/refine-ui/form/sign-in-form.tsx` | Login UI |
| `src/components/refine-ui/form/sign-up-form.tsx` | Register UI |
| `src/components/refine-ui/form/forgot-password-form.tsx` | Forgot-password UI |
| `src/pages/login/index.tsx` | Login page wrapper |
| `src/pages/register/index.tsx` | Register page wrapper |
| `src/pages/forgot-password/index.tsx` | Forgot-password page wrapper |
| `src/App.tsx` | Route definitions |
| `supabase/config.toml` | Local auth config |
| `supabase/baseline.sql` | DB trigger for profile creation |

---

## Sign-In Flow (Email)

**Path:** `/login` → `SignInForm` → `useLogin()` → `authProvider.login({ email, password })`

1. Form validates email regex + password ≥6 chars ✅
2. Calls `supabaseClient.auth.signInWithPassword({ email, password })` ✅
3. On success: fetches profile, sets analytics, redirects to `/` ✅
4. On error: sets `error` state + toast notification ✅
5. **Issue:** `rememberMe` checkbox state is never used — UI widget with no effect

---

## Sign-Up Flow (Email)

**Path:** `/register` → `SignUpForm` → `useRegister()` → `authProvider.register({ email, password })`

1. Form validates email, password (6–72 chars), confirmPassword match ✅
2. Calls `supabaseClient.auth.signUp({ email, password })` ✅
3. `handle_new_user` DB trigger auto-creates `profiles` row on `auth.users` insert ✅
4. **Issue A:** No check for `data.user?.identities?.length === 0` — Supabase uses this to signal "email already registered" without exposing an error (email enumeration protection). User silently gets redirected to `/` but may not be authenticated.
5. **Issue B:** Always returns `{ success: true, redirectTo: "/" }` — if production enables `enable_confirmations = true`, `data.session` will be `null` and the user lands on a protected route unauthenticated, gets bounced back to `/login` with no explanation.
6. No "check your email" confirmation screen/message shown anywhere.

---

## Sign-Up with Google (from Register Page)

**Path:** `/register` → `SignUpForm` → `handleSignUpWithGoogle()` → `register({ providerName: "google" })`

**CRITICAL BUG:** `authProvider.register` has no `providerName` branch:

```ts
// authProvider.ts:91
register: async ({ email, password }) => {
  // No check for providerName — goes straight to:
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  // email = undefined, password = undefined → Supabase error
```

Result: Supabase returns error `"Signup requires a valid password"`. The error propagates to `onError` in the form and shows an error toast. Google OAuth never initiates.

---

## Forgot Password Flow

**Path:** `/forgot-password` → `ForgotPasswordForm` → `authProvider.forgotPassword({ email })`

1. Calls `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: "${origin}/update-password" })` ✅
2. Email is sent with a link to `${origin}/update-password`
3. **CRITICAL BUG:** `/update-password` route does NOT exist in `App.tsx`. User clicks email link → 404/error component.
4. `authProvider.updatePassword` IS implemented but has no associated route or UI form.

---

## Profile Auto-Creation (DB Trigger)

```sql
-- baseline.sql:317
CREATE OR REPLACE FUNCTION handle_new_user() ...
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- Trigger fires for ALL auth methods (email + OAuth) ✅
- Uses `NEW.raw_user_meta_data->>'full_name'` with fallback to email prefix ✅
- Handles existing email clash (from pending-email participants) via FK migration ✅
- Profile creation is consistent between email and Google users ✅

---

## Supabase Local Auth Config

| Setting | Value | Note |
|---------|-------|------|
| `enable_signup` | `true` | Email signup enabled locally |
| `enable_confirmations` | `false` | No email verification locally — **may differ in production** |
| `minimum_password_length` | `6` | Matches frontend validation ✅ |
| `enable_anonymous_sign_ins` | `false` | Anon users disabled ✅ |

**Risk:** Production Supabase project may have `enable_confirmations = true`. The app has no handling for this case.

---

## Unresolved Questions

1. Does the production Supabase project have `enable_confirmations = true`?
2. What is the production `site_url` and `additional_redirect_urls` — does `${origin}/update-password` need to be whitelisted?
