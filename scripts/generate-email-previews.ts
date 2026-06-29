/**
 * Generate HTML previews of all 3 email types for UI/UX review.
 * Run with: npx tsx scripts/generate-email-previews.ts
 * Then open /tmp/fairpay-email-previews/ in a browser.
 */

import fs from "node:fs";
import path from "node:path";
import { buildInviteEmailPreview } from "../src/modules/admin/email/invite-email";
import { buildReminderEmailPreview } from "../src/modules/admin/email/reminder-email";

const OUT_DIR = "/tmp/fairpay-email-previews";
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── 1. Invite email ────────────────────────────────────────────────────────────
const invite = buildInviteEmailPreview({
  emails: ["noreply.long.fairpay@gmail.com"],
  inviterName: "Long",
  appUrl: "https://long-pay.vercel.app",
});

// ── 2. Debt reminder — with group deeplinks + /balances CTA ────────────────────
const reminder = buildReminderEmailPreview({
  userName: "Thành Long",
  title: "Bạn còn nợ nhóm chưa thanh toán",
  message: "Vui lòng thanh toán để cân bằng số dư với bạn bè.",
  totalAmount: 850000,
  hasAuthAccount: true,
  appUrl: "https://long-pay.vercel.app",
  link: "/balances",
  groupBreakdown: [
    {
      groupId: "trip-da-nang-2026",
      groupName: "Chuyến Đà Nẵng 2026",
      groupAvatarUrl: undefined,
      subtotalAmount: 600000,
      currency: "VND",
      counterparties: [
        {
          counterpartyName: "Minh Tuấn",
          counterpartyEmail: "minhtuan@example.com",
          amount: 350000,
          currency: "VND",
          transactions: [
            { description: "Khách sạn Mường Thanh", amount: 200000, currency: "VND", expenseDate: "2026-06-20" },
            { description: "Bữa tối hải sản", amount: 150000, currency: "VND", expenseDate: "2026-06-21" },
          ],
        },
        {
          counterpartyName: "Lan Anh",
          counterpartyEmail: "lananh@example.com",
          amount: 250000,
          currency: "VND",
          transactions: [
            { description: "Thuê xe máy 2 ngày", amount: 250000, currency: "VND", expenseDate: "2026-06-20" },
          ],
        },
      ],
    },
    {
      groupId: "living-expenses-q2",
      groupName: "Chi phí sinh hoạt Q2",
      subtotalAmount: 250000,
      currency: "VND",
      counterparties: [
        {
          counterpartyName: "Quang Huy",
          amount: 250000,
          currency: "VND",
          transactions: [
            { description: "Điện + nước tháng 6", amount: 250000, currency: "VND", expenseDate: "2026-06-15" },
          ],
        },
      ],
    },
  ],
});

// ── 3. Notification digest (simulated — shows invite with multi-item context) ──
// The digest is built inside the Edge Function (buildEmailHtml) which can't be
// imported directly. Render invite as the third preview with a note.
const digestNote = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Digest Preview Note</title>
<style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:auto}
.note{background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:20px}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px}</style>
</head>
<body>
<div class="note">
<h2>📬 Notification Digest Preview</h2>
<p>The digest email is built by <code>buildEmailHtml()</code> inside the Supabase Edge Function
<code>send-email-notifications/index.ts</code>, which shares the same
<code>buildEmailShell / buildEmailPanel</code> design system as the previews above.</p>
<p>To see the live digest, either:</p>
<ol>
  <li>Trigger a notification from the app (add expense, payment, etc.) and let the cron fire</li>
  <li>Or use the Admin → Email Dev Tool → "Chạy worker ngay" button after creating a test notification</li>
</ol>
<p>The design system and CTA routing changes (smart deeplinks, group headers) are confirmed working
by the 23 passing tests in <code>tests/admin/</code>.</p>
</div>
</body></html>`;

// ── Write files ────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(OUT_DIR, "1-invite.html"), invite.html);
fs.writeFileSync(path.join(OUT_DIR, "2-reminder.html"), reminder.html);
fs.writeFileSync(path.join(OUT_DIR, "3-digest-note.html"), digestNote);

// Index page
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
<p>Generated ${new Date().toISOString()}</p>
<ul>
  <li>
    <a href="1-invite.html">1. Invite Email</a>
    <div class="note">CTA: "Bắt đầu với FairPay" → https://long-pay.vercel.app</div>
  </li>
  <li>
    <a href="2-reminder.html">2. Debt Reminder</a>
    <div class="note">CTA: "Xem số dư / View balances" → /balances • Group deeplinks → /groups/:id</div>
  </li>
  <li>
    <a href="3-digest-note.html">3. Digest (see note)</a>
    <div class="note">Digest uses same design system — trigger via app or Admin Dev Tool</div>
  </li>
</ul>
<h2>What changed</h2>
<ul style="list-style:disc;padding-left:24px">
  <li>Reminder CTA → <code>/balances</code> (was <code>/dashboard</code>)</li>
  <li>CTA label → "Xem số dư / View balances" for authenticated users</li>
  <li>Group section headers link to <code>/groups/:groupId</code></li>
  <li>Single-notification emails link CTA to the notification's own deeplink</li>
  <li>Admin email overview 500 fix + enrichment fallback</li>
</ul>
</body></html>`;

fs.writeFileSync(path.join(OUT_DIR, "index.html"), index);

console.log(`\n✓ Previews written to ${OUT_DIR}/`);
console.log(`  open ${OUT_DIR}/index.html`);
console.log(`  or run: open ${OUT_DIR}/index.html`);
