import { escapeHtml, renderInviteEmail, type InviteEmailContent, type RenderedEmail } from "@fairpay/emails";
import { ensureEmailRenderReady } from "./ensure-render-ready";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface InviteEmailPreviewInput {
  emails: string[];
  inviterName?: string | null;
  appUrl?: string;
  content?: Partial<InviteEmailContent>;
}

export interface InviteEmailPreview extends RenderedEmail {
  recipients: string[];
}

export function normalizeInviteEmails(value: string | string[]): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : value.split(/[\s,;]+/);

  const emails = rawItems.reduce<string[]>((acc, email) => {
    const normalized = email.trim().toLowerCase();
    if (EMAIL_RE.test(normalized)) acc.push(normalized);
    return acc;
  }, []);

  return Array.from(new Set(emails));
}

export function escapeInviteHtml(text: string): string {
  return escapeHtml(text);
}

export async function buildInviteEmailPreview(input: InviteEmailPreviewInput): Promise<InviteEmailPreview> {
  await ensureEmailRenderReady();
  const rendered = await renderInviteEmail({
    inviterName: input.inviterName,
    appUrl: input.appUrl,
    content: input.content,
  });

  return { recipients: normalizeInviteEmails(input.emails), ...rendered };
}
