# Donation widget — local testing

The donation widget is the floating avatar on authenticated app routes (mounted in `App.tsx`). Open the dialog by tapping it.

## Quick start

1. `pnpm dev` → http://localhost:3000
2. Sign in (any account with your Supabase project).
3. On **any main app route** (e.g. `/` dashboard), look for the floating heart/avatar button (bottom-left).

### If the widget does not appear

| Situation | Fix |
|-----------|-----|
| No `donation_settings` row | In **dev**, a mock config is injected automatically (unless `VITE_DONATION_WIDGET_PREVIEW=false`). |
| Row exists but `is_enabled = false` | Add to **`.env.local`**: `VITE_DONATION_WIDGET_PREVIEW=true` |
| You are admin | Set `VITE_ADMIN_EMAIL` to your login email to preview while disabled in DB |

### Optional `.env.local` overrides

```bash
VITE_DONATION_WIDGET_PREVIEW=true
VITE_DONATION_PREVIEW_AMOUNT=50000
# VITE_DONATION_PREVIEW_QR_URL=https://…   # optional custom QR image
VITE_ADMIN_EMAIL=you@example.com
```

Configure real data (images, bank fields, suggested amount) at **http://localhost:3000/settings/donation** when logged in as an admin.

## Deeplink / QR behavior

- QR tap and **Open bank app** use `generateVietQRDeeplink` (unchanged contract).
- Suggested amount (when set) is shown in the dialog and passed to the deeplink `am` parameter.
