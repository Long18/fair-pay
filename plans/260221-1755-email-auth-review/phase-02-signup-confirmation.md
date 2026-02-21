# Phase 02 — Sign-up & Confirmation Fixes (P1)

**Parent:** [plan.md](./plan.md)
**Depends on:** [Phase 01](./phase-01-critical-blockers.md) (recommended first)
**Date:** 2026-02-21
**Priority:** P1 — Critical for production correctness
**Status:** ⬜ Pending

---

## Overview

The register flow returns `success: true` and redirects to `/` even when:
- Email confirmation is required (production Supabase setting)
- The email is already registered (Supabase silently succeeds to prevent enumeration)

Both scenarios leave the user confused — they get bounced back to `/login` silently with no explanation.

---

## Key Insights

- `supabaseClient.auth.signUp()` return shape differs based on Supabase config:
  - **confirmations disabled** (local): `{ user: {..., email_confirmed_at: timestamp}, session: {...} }` — user is immediately logged in
  - **confirmations enabled** (likely production): `{ user: {..., email_confirmed_at: null}, session: null }` — user must verify email first
  - **duplicate email + confirmations disabled**: `{ user: { identities: [] }, session: null }` — Supabase hides the error
  - **duplicate email + confirmations enabled**: `{ user: null, session: null, error: null }` — complete silence
- The fix requires branching on `data.session` and `data.user?.identities?.length`
- A "check your email" page/state is needed but can be done as an inline message rather than a full new page

---

## Requirements

1. After sign-up with email confirmation required → show "Check your email" message (not redirect to `/`)
2. After sign-up with duplicate email → show specific "email already in use" error
3. `authProvider.register` must distinguish session vs no-session response

---

## Architecture

### authProvider.register — Updated Logic

```ts
register: async ({ email, password, providerName }) => {
  if (providerName) { /* OAuth — Phase 01 */ }

  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) return { success: false, error };

  if (data.user) {
    // Duplicate email detection (confirmations OFF)
    if (data.user.identities?.length === 0) {
      return {
        success: false,
        error: { name: "EmailExists", message: "An account with this email already exists." },
      };
    }

    if (data.session) {
      // Immediately logged in — set analytics, redirect
      AuthTracker.register('email');
      analyticsManager.setUser(data.user.id, { email: data.user.email, ... });
      return { success: true, redirectTo: "/" };
    } else {
      // Email confirmation required
      AuthTracker.register('email');
      return {
        success: true,
        // Don't redirect — signal the form to show "check email" state
        // Refine interprets success:true + no redirectTo as staying on page
        // We use successNotification in the form to show the message
      };
    }
  }

  // data.user === null (duplicate email + confirmations ON)
  return {
    success: false,
    error: { name: "EmailExists", message: "An account with this email already exists." },
  };
};
```

### SignUpForm — Handle "email sent" state

Add `emailSent` boolean state to `SignUpForm`:

```tsx
const [emailSent, setEmailSent] = useState(false);

register(
  { email, password },
  {
    onSuccess: (data) => {
      setIsLoading(false);
      // If Refine redirected → nothing more needed
      // If no redirect (email confirmation required) → show email sent UI
      if (!data?.redirectTo) setEmailSent(true);
    },
    ...
  }
);
```

When `emailSent = true`, replace form content with:
- ✉️ icon + "Check your email" heading
- "We sent a confirmation link to {email}"
- "Didn't receive it? Check spam or resend" (optional)

---

## Related Code Files

| File | Change |
|------|--------|
| `src/authProvider.ts:109-128` | Add session/identities branching |
| `src/components/refine-ui/form/sign-up-form.tsx:127-144` | Handle emailSent state + confirmation UI |
| `src/locales/en.json` | Add `auth.checkYourEmail`, `auth.emailConfirmationSent`, `auth.emailAlreadyRegistered` |
| `src/locales/vi.json` | Vietnamese equivalents |

---

## Implementation Steps

### Step 1: Update `authProvider.register` branch logic
- **File:** `src/authProvider.ts:109`
- After `if (data.user)`: add `identities?.length === 0` check for duplicate email
- After duplicate check: branch on `data.session !== null` vs `null`
- Keep `AuthTracker.register` and `analyticsManager.setUser` calls on true success paths
- Return `{ success: true }` (no `redirectTo`) when email confirmation needed

### Step 2: Update `SignUpForm` to show email-sent state
- **File:** `src/components/refine-ui/form/sign-up-form.tsx`
- Add `emailSent` state
- In `onSuccess` callback: check if page wasn't redirected → set `emailSent = true`
- Render a success view inside the Card when `emailSent === true`:
  - Icon (mail/check)
  - Heading: `t("auth.checkYourEmail")`
  - Body: `t("auth.emailConfirmationSent", { email })`
  - Link back to `/login`

### Step 3: Add i18n keys
- `auth.checkYourEmail`: "Check your email"
- `auth.emailConfirmationSent`: "We sent a confirmation link to {{email}}. Click it to activate your account."
- `auth.emailAlreadyRegistered`: "An account with this email already exists. Try signing in instead."
- `auth.backToSignIn`: "Back to sign in"

---

## Todo

- [ ] Update `authProvider.register` to branch on `data.session` and `data.user?.identities?.length`
- [ ] Add "email already registered" error return
- [ ] Add "confirmation required" return (success, no redirect)
- [ ] Update `SignUpForm.onSuccess` to detect no-redirect and set `emailSent = true`
- [ ] Design + add email-sent confirmation UI inside `SignUpForm`
- [ ] Add i18n keys to `en.json` and `vi.json`
- [ ] Test: sign up with new email (local — should log in immediately)
- [ ] Test: sign up with duplicate email → error shown
- [ ] Simulate: sign up with `enable_confirmations = true` → check-email state shown

---

## Success Criteria

- [ ] New email sign-up (local, no confirmations) → user logged in, redirected to `/`
- [ ] New email sign-up (production, confirmations ON) → "Check your email" message shown, user NOT redirected
- [ ] Duplicate email sign-up → clear error: "An account with this email already exists"
- [ ] No more silent bounce from `/` back to `/login`

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `onSuccess` callback receiving redirect info — Refine may not pass this | Medium | Test with Refine source; alternatively use `data.user.email_confirmed_at` check in authProvider |
| Production confirmation setting unknown | High | Confirm with Supabase dashboard; implement defensively for both cases |

---

## Security Considerations

- Do NOT expose whether an email is registered via success/failure discrimination. The current approach returns the same generic error for both "duplicate email" cases — this is intentional and consistent with Supabase's own enumeration protection behavior.

---

## Next Steps

After Phase 02 → proceed to [Phase 03 — UX Polish & i18n](./phase-03-ux-polish.md)
