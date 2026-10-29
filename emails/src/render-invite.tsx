import { render, toPlainText } from "@react-email/render";
import { InviteEmail, resolveInviteEmail } from "./invite-email";
import type { InviteEmailInput, RenderedEmail } from "./types";
import { fillTemplate } from "./utils";

export async function renderInviteEmail(input: InviteEmailInput): Promise<RenderedEmail> {
  const { appUrl, content, tokens, subject, previewText, bodyHtml } = resolveInviteEmail(input);
  const html = await render(<InviteEmail {...input} />);
  const text = [
    toPlainText(bodyHtml, { wordwrap: false }),
    "",
    `${fillTemplate(content.ctaLabel, tokens)}: ${appUrl}`,
    "",
    content.textSignature,
  ].join("\n");

  return { subject, previewText, html, text };
}
