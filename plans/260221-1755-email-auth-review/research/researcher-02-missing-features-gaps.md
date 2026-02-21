# Research 02 — Missing Features & UX Gaps

**Date:** 2026-02-21
**Scope:** UX gaps, missing UI, i18n, and consistency issues

---

## Issue Inventory

### P0 — Blockers (Feature Broken)

#### [P0-1] Google OAuth broken on Register page
- **File:** `src/components/refine-ui/form/sign-up-form.tsx:148-150`
- **File:** `src/authProvider.ts:91`
- `handleSignUpWithGoogle()` calls `register({ providerName: "google" })`
- `authProvider.register` has NO `providerName` branch → calls `signUp(undefined, undefined)`
- **Fix:** Add `providerName` check in `authProvider.register` that delegates to `signInWithOAuth` (same as login)

#### [P0-2] /update-password page missing
- **File:** `src/authProvider.ts:154` — redirectTo points to `/update-password`
- **File:** `src/App.tsx` — no `/update-password` route exists
- Users who click "reset password" email get a broken page
- `authProvider.updatePassword` is implemented but unreachable
- **Fix:** Create `UpdatePasswordForm` component + `/update-password` route + Supabase session recovery from URL hash

### P1 — Significant Issues

#### [P1-1] No email confirmation feedback after sign-up
- **File:** `src/authProvider.ts:109-128`
- Always returns `{ success: true, redirectTo: "/" }` regardless of whether session was created
- If `data.session === null` (email confirmation required in production), user is redirected to `/` unauthenticated → immediately bounced to `/login` with no explanation
- **Fix:** Check `data.session` — if null, return a specific success state and show "check your email" message
- No dedicated "email sent" confirmation screen exists anywhere in the app

#### [P1-2] Duplicate email sign-up — silent failure
- **File:** `src/authProvider.ts:109`
- When `enable_confirmations = false`, Supabase returns `{ data: { user: {...}, session: null }, error: null }` for duplicate emails (email enumeration protection)
- When `enable_confirmations = true`, Supabase returns `{ data: { user: null, session: null }, error: null }` — the app reaches the final fallback `return { success: false, error: { message: "Register failed" } }` with a generic error message
- **Fix:** Handle both cases — check `data.user?.identities?.length === 0` for duplicate-email detection

### P2 — UX Problems

#### [P2-1] `rememberMe` checkbox is non-functional
- **File:** `src/components/refine-ui/form/sign-in-form.tsx:27, 234-247`
- State `rememberMe` exists but is never used in the `login()` call
- Supabase JS v2 uses localStorage by default (persistent), so the checkbox is misleading
- **Fix:** Either remove the checkbox, or use `supabaseClient.auth.signInWithPassword` + localStorage strategy

#### [P2-2] Forgot-password form has no loading state, error handling, or success feedback
- **File:** `src/components/refine-ui/form/forgot-password-form.tsx`
- No `isLoading` state — button doesn't indicate pending state
- No error display — if email doesn't exist or rate limit hit, user sees nothing
- No success state — after submit, form stays static with no confirmation
- Compare with sign-in-form which has full `isLoading`, error alert, and toast

#### [P2-3] Forgot-password form uses hardcoded English strings (no i18n)
- **File:** `src/components/refine-ui/form/forgot-password-form.tsx`
- No `useTranslation()` import — all labels are hardcoded English
- "Forgot password?", "Enter your email to reset your password", "Send reset link", "Back to login"
- All other auth forms use `useTranslation()` with proper keys

#### [P2-4] Forgot-password form styling inconsistency
- Uses `from-teal-50 via-background to-purple-50` gradient
- Sign-in and sign-up use `from-primary/5 via-background to-accent/5`
- Doesn't use `Glass` class, no animated entrance

### P3 — Minor

#### [P3-1] Missing i18n keys for auth confirmations
- `src/locales/en.json` and `vi.json` need keys:
  - `auth.checkYourEmail`, `auth.emailSent`, `auth.passwordResetSent`
  - `auth.updatePassword`, `auth.newPassword`, `auth.confirmNewPassword`
  - `auth.sendResetLink`, `auth.backToLogin`
  - `auth.passwordResetSuccess`

---

## Auth Flow Comparison: Google vs Email

| Step | Google OAuth | Email/Password |
|------|-------------|----------------|
| Sign-in trigger | Login page ✅ | Login page ✅ |
| Sign-up trigger | **Register broken (P0-1)** | Register page ✅ |
| Profile creation | DB trigger ✅ | DB trigger ✅ |
| Post-auth redirect | → `/` ✅ | → `/` ✅ |
| Password reset | N/A | Reset email → **/update-password broken (P0-2)** |
| Email confirmation | N/A | **Not handled (P1-1)** |

---

## Unresolved Questions

1. Should `/update-password` require the user to be in a special Supabase "recovery" session state?
   - Yes — Supabase sends `#access_token=...&type=recovery` in URL hash; app must call `supabaseClient.auth.getSession()` or listen to `onAuthStateChange` with event `PASSWORD_RECOVERY`
2. Should the "Update Password" feature in `/profile` (show-unified.tsx) reuse the same component?
