# @fairpay/emails

React Email templates for the **Invite users by email** and **Debt reminder** emails. One source renders:

- the admin previews (People → Invite, DevTool → Debt reminder) in the browser,
- the admin **Email templates** editor tab (DevTool → Email templates),
- the real SMTP sends in `supabase/functions/send-email-notifications` via a pre-built Deno bundle.

```
emails/
  src/
    content/*.static.json   static copy (edited in the admin Email templates tab)
    components/             FairPay shell, panel, rich text, debt breakdown
    invite-email.tsx        <InviteEmail />
    debt-reminder-email.tsx <DebtReminderEmail />
    render-*.tsx            render() + plain-text builders → { subject, previewText, html, text }
    edge-entry.ts           entry for the Supabase Edge bundle
  templates/                default exports for `email dev`
```

## Workflows

| Task | Command |
|------|---------|
| Live preview server (React Email UI, port 3030) | `pnpm email:dev` |
| Static HTML previews in `/tmp/fairpay-email-previews` | `pnpm email:previews` |
| Rebuild the Edge bundle after any change in `emails/src` | `pnpm email:build` |
| Verify the committed bundle is fresh (CI) | `node scripts/bundle-transactional-emails.mjs --check` |

### Editing copy

1. Open **Admin → DevTool → Email templates**, pick a template.
2. Edit `*Html` fields in the embedded [React Email editor](https://react.email/docs/editor/overview) (select text for the bubble menu, `/` for blocks) and the plain text fields. The live preview uses the same renderer as real sends.
3. **Download JSON** (or Copy JSON) and save it over `emails/src/content/<file>`.
4. Run `pnpm email:build` and commit the content file together with `supabase/functions/_shared/transactional-email.bundle.*`, then deploy the `send-email-notifications` function.

Drafts are kept in the browser's localStorage until reset; nothing is written to the database.

### Placeholders

`{{token}}` placeholders are filled at render time. Values are HTML-escaped inside `*Html` fields.

- Invite: `{{inviterName}}`, `{{appUrl}}`
- Debt reminder: `{{userName}}`, `{{title}}`, `{{message}}`, `{{total}}`

Dynamic parts (group cards, counterparties, transactions, CTA targets) live in the components, not in the editable copy.

## Edge bundle notes

`scripts/bundle-transactional-emails.mjs` bundles React, `react-dom/server` (browser/Deno build) and `@react-email/render` into `transactional-email.bundle.mjs` (~380 KB). Prettier is stubbed out because `pretty()` is never used. Edge Functions cannot import from outside `supabase/functions/`, which is why the bundle is generated and committed rather than imported from source.
