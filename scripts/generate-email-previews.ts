/**
 * Write static HTML previews of the React Email templates for quick UI/UX review.
 * Run with: pnpm email:previews   (or `pnpm email:dev` for the live React Email preview server)
 * Then open /tmp/fairpay-email-previews/index.html in a browser.
 */

import fs from "node:fs";
import path from "node:path";
import { DebtReminderEmail, renderDebtReminderEmail, renderInviteEmail } from "../emails/src/index";

const OUT_DIR = "/tmp/fairpay-email-previews";
fs.mkdirSync(OUT_DIR, { recursive: true });

const previews = [
  {
    file: "1-invite.html",
    label: "1. Invite email",
    note: 'CTA "Bắt đầu với FairPay" → app URL',
    email: await renderInviteEmail({ inviterName: "Long", appUrl: "https://long-pay.vercel.app" }),
  },
  {
    file: "2-reminder.html",
    label: "2. Debt reminder (account)",
    note: "CTA → /balances • group headers → /groups/:id",
    email: await renderDebtReminderEmail(DebtReminderEmail.PreviewProps),
  },
  {
    file: "3-reminder-guest.html",
    label: "3. Debt reminder (placeholder recipient)",
    note: "CTA → /register",
    email: await renderDebtReminderEmail({ ...DebtReminderEmail.PreviewProps, hasAuthAccount: false }),
  },
];

for (const preview of previews) {
  fs.writeFileSync(path.join(OUT_DIR, preview.file), preview.email.html);
}

const index = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>FairPay Email Previews</title>
<style>body{font-family:sans-serif;padding:40px;max-width:700px;margin:auto}
ul{list-style:none;padding:0}li{margin:12px 0}
a{display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
.note{font-size:13px;color:#64748b;margin-top:4px}
</style></head>
<body>
<h1>FairPay Email Previews</h1>
<p>Generated ${new Date().toISOString()} from emails/src (React Email).</p>
<ul>
${previews.map((p) => `  <li><a href="${p.file}">${p.label}</a><div class="note">${p.email.subject} — ${p.note}</div></li>`).join("\n")}
</ul>
</body></html>`;

fs.writeFileSync(path.join(OUT_DIR, "index.html"), index);

console.log(`\n✓ Previews written to ${OUT_DIR}/`);
console.log(`  open ${OUT_DIR}/index.html`);
