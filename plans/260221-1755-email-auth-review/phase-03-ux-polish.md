# Phase 03 — UX Polish & i18n (P2/P3)

**Parent:** [plan.md](./plan.md)
**Depends on:** [Phase 01](./phase-01-critical-blockers.md), [Phase 02](./phase-02-signup-confirmation.md)
**Date:** 2026-02-21
**Priority:** P2/P3 — Polish, non-blocking
**Status:** ⬜ Pending

---

## Overview

The `forgot-password-form` is missing loading states, error/success feedback, and i18n.
The `rememberMe` checkbox on the login form is non-functional (misleading UX).
Visual inconsistency between forgot-password and the other auth forms.

---

## Key Insights

- The forgot-password form was the original Refine scaffold — it was never updated to match the polished sign-in/sign-up forms
- `rememberMe` doesn't map to any Supabase concept — Supabase JS v2 uses localStorage by default (always "remembered"). The checkbox is purely decorative and misleading.
- `useForgotPassword()` from `@refinedev/core` returns `{ mutate, isLoading, isSuccess, isError }` — the form can use these instead of manual state

---

## Requirements

1. `ForgotPasswordForm` must show loading state during submission
2. `ForgotPasswordForm` must show success state after email sent
3. `ForgotPasswordForm` must show error state if submission fails
4. All `ForgotPasswordForm` strings must use `useTranslation()`
5. `ForgotPasswordForm` visual style must match sign-in/sign-up forms
6. `rememberMe` checkbox must be removed from `SignInForm` (or documented why it's kept)

---

## Related Code Files

| File | Change |
|------|--------|
| `src/components/refine-ui/form/forgot-password-form.tsx` | Full overhaul — loading, error, success, i18n, styling |
| `src/components/refine-ui/form/sign-in-form.tsx:27,234-247` | Remove non-functional `rememberMe` checkbox |
| `src/locales/en.json` | Add forgot-password i18n keys |
| `src/locales/vi.json` | Vietnamese equivalents |

---

## Implementation Steps

### Step 1: Overhaul `ForgotPasswordForm`

**File:** `src/components/refine-ui/form/forgot-password-form.tsx`

Changes:
1. Add `useTranslation()` import and replace all hardcoded strings with `t()` calls
2. Leverage `isLoading`, `isSuccess` from `useForgotPassword()` hook instead of manual state
3. Add `isLoading` spinner on submit button (same pattern as `sign-in-form.tsx:222-231`)
4. Add `isSuccess` state — replace form with a success card:
   - ✉️ icon + "Check your email" heading
   - "We sent a password reset link to {email}"
   - Link back to `/login`
5. Add error handling — `useForgotPassword` `onError` callback → set error state → show Alert (same as sign-in-form)
6. Update gradient: `from-primary/5 via-background to-accent/5` (matches other auth pages)
7. Add `glass bg-card/95 backdrop-blur-sm` to Card className
8. Add `animate-in fade-in slide-in-from-bottom-4 duration-500` entrance animation
9. Add decorative blurred circles (copy from sign-in-form lines 121-126)

**i18n keys to use:**
- `auth.forgotPassword` (already exists: "Forgot Password?")
- `auth.forgotPasswordDescription`: "Enter your email to receive a reset link"
- `auth.sendResetLink`: "Send reset link"
- `auth.sendingResetLink`: "Sending..."
- `auth.resetLinkSent`: "Reset link sent!"
- `auth.resetLinkSentDescription`: "Check your email for a link to reset your password."
- `auth.backToLogin`: "Back to login"
- `auth.resetLinkFailed`: "Failed to send reset link"

### Step 2: Remove non-functional `rememberMe` checkbox

**File:** `src/components/refine-ui/form/sign-in-form.tsx`

- Remove state: `const [rememberMe, setRememberMe] = useState(false)` (line 27)
- Remove the `<div className="flex items-center justify-between ...">` block (lines 233-257) that contains both the checkbox and forgot-password link
- Keep the forgot-password link — move it above the submit button or below, standalone:
  ```tsx
  <div className="text-right">
    <Link to="/forgot-password" ...>{t("auth.forgotPassword")}</Link>
  </div>
  ```
- Remove `Checkbox` import if no longer used

### Step 3: Add i18n keys to locales

**`src/locales/en.json`** — add under `"auth"`:
```json
"forgotPasswordDescription": "Enter your email to receive a reset link",
"sendResetLink": "Send reset link",
"sendingResetLink": "Sending...",
"resetLinkSent": "Reset link sent!",
"resetLinkSentDescription": "Check your email for a link to reset your password. It may take a few minutes.",
"backToLogin": "Back to login",
"resetLinkFailed": "Failed to send reset link. Please try again."
```

**`src/locales/vi.json`** — add Vietnamese equivalents

---

## Todo

- [ ] Rewrite `forgot-password-form.tsx` with loading/success/error states
- [ ] Replace all hardcoded strings with `t()` keys in forgot-password-form
- [ ] Fix forgot-password-form gradient + glass + animation to match sign-in-form
- [ ] Remove `rememberMe` state and checkbox from `sign-in-form.tsx`
- [ ] Reposition forgot-password link after rememberMe removal
- [ ] Add all new i18n keys to `en.json`
- [ ] Add all new i18n keys to `vi.json`
- [ ] Verify forgot-password form shows loading spinner on submit
- [ ] Verify forgot-password form shows success view after email sent
- [ ] Verify forgot-password form shows error if rate-limited or invalid

---

## Success Criteria

- [ ] Submitting forgot-password form shows spinner during pending
- [ ] After email sent: form replaced with "check your email" success view
- [ ] If submission fails: error alert shown with message
- [ ] All forgot-password strings appear correctly in EN and VI languages
- [ ] Forgot-password page visually matches sign-in and sign-up pages
- [ ] Sign-in page no longer has non-functional rememberMe checkbox
- [ ] Forgot-password link still accessible on sign-in page

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `useForgotPassword` hook doesn't expose `isSuccess` | Low | Check Refine v5 docs; use manual `successSent` state if needed |
| Removing rememberMe breaks existing sessions | None | rememberMe wasn't wired to anything — no behavioral change |

---

## Security Considerations

- Don't show different success messages based on whether the email exists (prevents enumeration)
- The success message should always say "check your email" regardless of whether the email was found
