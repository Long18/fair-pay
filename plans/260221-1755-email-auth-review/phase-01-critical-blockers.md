# Phase 01 — Critical Blockers (P0)

**Parent:** [plan.md](./plan.md)
**Date:** 2026-02-21
**Priority:** P0 — Must fix before testing email auth
**Status:** ⬜ Pending

---

## Overview

Two features are completely broken for email-based users:
1. Google OAuth on the Register page calls the wrong authProvider method
2. Password reset emails link to a non-existent `/update-password` page

---

## Key Insights

- `authProvider.register` was never given an OAuth branch — likely an oversight when the sign-up form was styled with a Google button
- `authProvider.updatePassword` was implemented in anticipation of a page that was never created
- Supabase password recovery uses a URL hash `#access_token=...&type=recovery` — the update-password page MUST exchange this token before the user can set a new password
- The `onAuthStateChange` event `PASSWORD_RECOVERY` is the correct hook to detect this state

---

## Requirements

1. Google button on Register page must initiate OAuth (same as Login page)
2. `/update-password` route must exist, render a form with new/confirm password fields
3. The update-password page must handle the Supabase recovery session from the URL hash
4. `authProvider.updatePassword` must be wired to the form via `useUpdatePassword()` hook

---

## Architecture

### Fix 1: authProvider.register — Add OAuth branch

```ts
// src/authProvider.ts — register()
register: async ({ email, password, providerName }) => {
  if (providerName) {
    // Delegate to OAuth — same as login
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: providerName,
      options: { redirectTo: window.location.origin },
    });
    if (error) return { success: false, error };
    if (data?.url) return { success: true, redirectTo: "/" };
  }
  // ... existing email/password signUp logic
}
```

### Fix 2: UpdatePassword page

New files needed:
- `src/components/refine-ui/form/update-password-form.tsx` — form UI with `useUpdatePassword()`
- `src/pages/update-password/index.tsx` — page wrapper
- Route added to `App.tsx`: `<Route path="/update-password" element={<UpdatePassword />} />`

The page must:
1. On mount, detect if URL contains `#type=recovery` token
2. If yes: show the new-password form
3. If no session/recovery: show an error or redirect to `/forgot-password`
4. On submit: call `authProvider.updatePassword({ password })` → redirect to `/`

**Recovery session detection:**
```ts
useEffect(() => {
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
  });
}, []);
```

---

## Related Code Files

| File | Change |
|------|--------|
| `src/authProvider.ts:91` | Add `providerName` branch to `register()` |
| `src/components/refine-ui/form/update-password-form.tsx` | **Create new** |
| `src/pages/update-password/index.tsx` | **Create new** |
| `src/App.tsx:531-534` | Add `/update-password` route (public, non-auth-guarded) |
| `src/locales/en.json` | Add i18n keys for update-password |
| `src/locales/vi.json` | Add i18n keys (Vietnamese) |

---

## Implementation Steps

### Step 1: Fix `authProvider.register` — OAuth branch
- **File:** `src/authProvider.ts`
- Add `providerName` destructure to `register({ email, password, providerName })`
- Add `if (providerName)` block identical to the one in `login()` (lines 8-34)
- Track with `AuthTracker.login('oauth', providerName)` on success

### Step 2: Create `UpdatePasswordForm` component
- **File:** `src/components/refine-ui/form/update-password-form.tsx`
- State: `password`, `confirmPassword`, `isLoading`, `error`, `isRecovery`
- Use `useUpdatePassword()` from `@refinedev/core`
- Use `useTranslation()` for all strings
- Match visual style of `sign-in-form.tsx` (Card, gradient bg, animations)
- On mount: subscribe to `supabaseClient.auth.onAuthStateChange` for `PASSWORD_RECOVERY`
- Validate: password ≥ 6 chars, passwords match
- On success: show success toast, redirect to `/`
- If not in recovery mode: show "Invalid or expired reset link" + link to `/forgot-password`

### Step 3: Create page wrapper
- **File:** `src/pages/update-password/index.tsx`
- Simple wrapper: `export const UpdatePassword = () => <UpdatePasswordForm />`

### Step 4: Register route in App.tsx
- Add to the public auth routes block (lines 521-534, alongside `/login`, `/register`, `/forgot-password`)
- Import `UpdatePassword` from `./pages/update-password`
- Route: `<Route path="/update-password" element={<UpdatePassword />} />`
- Must be inside the `Authenticated` wrapper that redirects authenticated users away (else logged-in users can't reset via email)
- **Actually:** Should be OUTSIDE the auth guard — the reset link is sent to unauthenticated users. Place alongside login/register routes.

### Step 5: Add i18n keys
- `src/locales/en.json` → add under `"auth"`:
  ```json
  "updatePassword": "Update Password",
  "newPassword": "New Password",
  "confirmNewPassword": "Confirm New Password",
  "passwordUpdated": "Password updated successfully",
  "passwordUpdateFailed": "Failed to update password",
  "invalidResetLink": "This password reset link is invalid or has expired.",
  "requestNewResetLink": "Request a new link",
  "updatingPassword": "Updating..."
  ```
- `src/locales/vi.json` → add Vietnamese equivalents

---

## Todo

- [ ] Add `providerName` param to `authProvider.register`
- [ ] Create `src/components/refine-ui/form/update-password-form.tsx`
- [ ] Create `src/pages/update-password/index.tsx`
- [ ] Add `/update-password` route to `App.tsx`
- [ ] Add i18n keys to `en.json` and `vi.json`
- [ ] Verify: Google button on Register page now initiates OAuth
- [ ] Verify: visiting `/update-password` without recovery session shows error state
- [ ] Verify: visiting `/update-password` via reset email link shows the form and updates password

---

## Success Criteria

- [ ] Clicking "Continue with Google" on `/register` initiates Google OAuth (browser redirects to Google)
- [ ] Clicking "Forgot password?" → entering email → clicking link in email → lands on `/update-password` form
- [ ] Submitting new password on `/update-password` → redirected to `/` and logged in
- [ ] Visiting `/update-password` directly (no recovery token) → shows "invalid link" message

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Production Supabase redirect URL not whitelisted | Medium | Add `${productionOrigin}/update-password` to Supabase Dashboard → Auth → URL Configuration |
| `onAuthStateChange` fires before component mounts | Low | Use `getSession()` on mount as backup check |
| Token expiry during form fill | Low | Show clear "link expired" message with re-request CTA |

---

## Security Considerations

- The `/update-password` page must ONLY process Supabase recovery tokens — don't store or log them
- `authProvider.updatePassword` uses `supabaseClient.auth.updateUser({ password })` which requires an active recovery session — this is safe
- Rate limit on password reset emails: `email_sent = 2/hour` in local config (check production setting)

---

## Next Steps

After Phase 01 complete → proceed to [Phase 02 — Sign-up & Confirmation Fixes](./phase-02-signup-confirmation.md)
