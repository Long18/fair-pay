/**
 * Write static HTML + plain text previews of the React Email templates for quick UI/UX review.
 * Run with: pnpm email:previews   (or `pnpm email:dev` for the live React Email preview server)
 * Then open tmp/email-previews/index.html in a browser. The folder is gitignored.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, renderDebtReminderEmail, renderInviteEmail, renderableReminderFixtures } from "../emails/src/index";

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tmp/email-previews");
fs.mkdirSync(OUT_DIR, { recursive: true });

const previews = [
  {
    slug: "invite",
    label: "Invite",
    email: await renderInviteEmail({ inviterName: "Long", appUrl: "https://long-pay.vercel.app" }),
  },
  ...(await Promise.all(
    renderableReminderFixtures.map(async (fixture) => ({
      slug: `reminder-${fixture.id.toLowerCase()}`,
      label: `${fixture.id} · ${fixture.label}`,
      email: await renderDebtReminderEmail(fixture.input),
    })),
  )),
];

for (const preview of previews) {
  fs.writeFileSync(path.join(OUT_DIR, `${preview.slug}.html`), preview.email.html);
  fs.writeFileSync(path.join(OUT_DIR, `${preview.slug}.txt`), preview.email.text);
}

const rows = previews
  .map(
    (p) =>
      `  <li><a href="${p.slug}.html">${escapeHtml(p.label)}</a> <a class="txt" href="${p.slug}.txt">.txt</a>` +
      `<div class="note">${escapeHtml(p.email.subject)}<br>${escapeHtml(p.email.previewText)}</div></li>`,
  )
  .join("\n");

const index = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>FairPay Email Previews</title>
<style>body{font-family:sans-serif;padding:40px;max-width:760px;margin:auto}
ul{list-style:none;padding:0}li{margin:14px 0}
a{display:inline-block;padding:8px 14px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
a.txt{background:#e2e8f0;color:#0f172a}
.note{font-size:13px;color:#64748b;margin-top:4px}
</style></head>
<body>
<h1>FairPay Email Previews</h1>
<p>Generated ${new Date().toISOString()} from emails/src (React Email).</p>
<ul>
${rows}
</ul>
</body></html>`;

fs.writeFileSync(path.join(OUT_DIR, "index.html"), index);

console.log(`\n✓ Previews written to ${OUT_DIR}/`);
console.log(`  open ${OUT_DIR}/index.html`);
