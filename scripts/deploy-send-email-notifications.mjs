#!/usr/bin/env node
/**
 * Deploy send-email-notifications (worker + transactional-email.bundle.mjs) to remote Supabase.
 *
 * Requires SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
 *
 *   export SUPABASE_ACCESS_TOKEN=sbp_...
 *   pnpm deploy:email-worker
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fnRoot = path.join(root, 'supabase/functions');
const projectRef = 'nowtovakbozjjkdsjmtd';
const slug = 'send-email-notifications';

const files = [
  ['index.ts', 'send-email-notifications/index.ts'],
  ['routing.ts', 'send-email-notifications/routing.ts'],
  ['digest.ts', 'send-email-notifications/digest.ts'],
  ['../_shared/cors.ts', '_shared/cors.ts'],
  ['../_shared/email-design-system.ts', '_shared/email-design-system.ts'],
  ['../_shared/smtp-html-email.ts', '_shared/smtp-html-email.ts'],
  ['../_shared/transactional-email.bundle.mjs', '_shared/transactional-email.bundle.mjs'],
].map(([name, rel]) => ({
  name,
  content: fs.readFileSync(path.join(fnRoot, rel), 'utf8'),
}));

const url = `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=${encodeURIComponent(slug)}`;
const form = new FormData();
form.append(
  'metadata',
  JSON.stringify({
    name: slug,
    entrypoint_path: 'index.ts',
    verify_jwt: true,
  }),
);
for (const file of files) {
  form.append('file', new Blob([file.content], { type: 'text/plain' }), file.name);
}

const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const text = await res.text();
if (!res.ok) {
  console.error('Deploy failed', res.status, text.slice(0, 2000));
  process.exit(1);
}
console.log(text);
