export type EmailShellTone = "default" | "invite" | "reminder" | "lifecycle" | "warning";

interface EmailShellOptions {
  title: string;
  previewText: string;
  eyebrow: string;
  heading: string;
  subheading?: string;
  bodyHtml: string;
  ctaHref: string;
  ctaLabel: string;
  footerHtml?: string;
  tone?: EmailShellTone;
  heroHtml?: string;
}

interface EmailPanelOptions {
  label?: string;
  title?: string;
  description?: string;
  bodyHtml?: string;
  tone?: EmailShellTone;
  marker?: string;
}

// Pastel-first palette — each tone gets a calm, colorful identity.
// accent      = pill badges, CTA button, links
// accentSoft  = header gradient base, panel label bg
// accentText  = label text over accentSoft
// border      = card/panel outlines
const toneMap: Record<EmailShellTone, {
  accent: string;
  accentSoft: string;
  accentText: string;
  border: string;
}> = {
  default: {
    accent:     "#0ea5e9",  // sky-500
    accentSoft: "#e0f2fe",  // sky-100
    accentText: "#0284c7",  // sky-600
    border:     "#bae6fd",  // sky-200
  },
  invite: {
    accent:     "#8b5cf6",  // violet-500
    accentSoft: "#ede9fe",  // violet-100
    accentText: "#7c3aed",  // violet-600
    border:     "#ddd6fe",  // violet-200
  },
  reminder: {
    accent:     "#fb7185",  // rose-400 — warm, not alarming
    accentSoft: "#ffe4e6",  // rose-100
    accentText: "#f43f5e",  // rose-500
    border:     "#fecdd3",  // rose-200
  },
  lifecycle: {
    accent:     "#34d399",  // emerald-400
    accentSoft: "#d1fae5",  // emerald-100
    accentText: "#10b981",  // emerald-500
    border:     "#a7f3d0",  // emerald-200
  },
  warning: {
    accent:     "#fb923c",  // orange-400
    accentSoft: "#ffedd5",  // orange-100
    accentText: "#f97316",  // orange-500
    border:     "#fed7aa",  // orange-200
  },
};

export function buildEmailShell(options: EmailShellOptions): string {
  const tone = toneMap[options.tone ?? "default"];
  const footer = options.footerHtml ?? `
    You are receiving this because you have a FairPay account or were invited to FairPay.<br>
    To manage email notifications, open <strong>Settings &rarr; Notifications</strong>.
  `;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeEmailHtml(options.title)}</title>
  <style>
    @media only screen and (max-width: 640px) {
      .email-shell { padding: 10px 6px !important; }
      .email-card { border-radius: 20px !important; }
      .email-brand { padding: 20px 18px 16px !important; }
      .email-body { padding: 18px 18px 22px !important; }
      .email-heading { font-size: 22px !important; line-height: 1.2 !important; }
      .email-panel { padding: 14px 16px !important; }
      .cta-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .group-header-avatar { padding-bottom: 10px !important; }
      .group-header-amount { padding-top: 10px !important; text-align: left !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1e293b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeEmailHtml(options.previewText)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-shell" data-email-shell="fairpay-pastel" style="width:100%;background:#f4f7fb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #e2ecf4;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.07),0 1px 4px rgba(15,23,42,0.04);">
          <tr>
            <td class="email-brand" style="padding:30px 32px 26px;background-color:${tone.accentSoft};background-image:linear-gradient(150deg,${tone.accentSoft} 0%,#ffffff 100%);border-bottom:1px solid ${tone.border};">
              <div style="margin-bottom:14px;">
                <span style="display:inline-block;padding:4px 14px;background:${tone.accent};border-radius:100px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:800;color:#ffffff;">${escapeEmailHtml(options.eyebrow)}</span>
              </div>
              <h1 class="email-heading" style="margin:0;font-size:26px;line-height:1.2;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">${escapeEmailHtml(options.heading)}</h1>
              ${options.subheading ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#475569;">${escapeEmailHtml(options.subheading)}</p>` : ""}
            </td>
          </tr>
          ${options.heroHtml ?? ""}
          <tr>
            <td class="email-body" style="padding:28px 32px 32px;">
              ${options.bodyHtml}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
                <tr>
                  <td align="left">
                    <a class="cta-link" href="${escapeEmailAttribute(options.ctaHref)}" style="display:inline-block;border-radius:100px;background:${tone.accent};color:#ffffff;text-decoration:none;font-size:15px;line-height:1.2;font-weight:800;padding:14px 28px;text-align:center;">${escapeEmailHtml(options.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="max-width:640px;margin:16px auto 0;padding:0 4px;font-size:11px;line-height:1.7;color:#94a3b8;text-align:left;">
          ${footer}
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailPanel(options: EmailPanelOptions): string {
  const tone = toneMap[options.tone ?? "default"];

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-panel" data-email-block="${escapeEmailAttribute(options.marker ?? "email-panel")}" data-marker="${escapeEmailAttribute(options.marker ?? "email-panel")}" style="width:100%;margin:0 0 14px;border:1px solid ${tone.border};border-radius:20px;background:#ffffff;overflow:hidden;">
      <tr>
        <td class="email-panel" style="padding:16px 20px;">
          ${options.label ? `<div style="margin-bottom:10px;"><span style="display:inline-block;padding:3px 10px;background:${tone.accentSoft};border-radius:100px;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:${tone.accentText};">${escapeEmailHtml(options.label)}</span></div>` : ""}
          ${options.title ? `<div style="font-size:15px;line-height:1.45;font-weight:800;color:#0f172a;">${escapeEmailHtml(options.title)}</div>` : ""}
          ${options.description ? `<div style="margin-top:7px;font-size:13px;line-height:1.65;color:#475569;">${escapeEmailHtml(options.description)}</div>` : ""}
          ${options.bodyHtml ? `<div style="margin-top:12px;">${options.bodyHtml}</div>` : ""}
        </td>
      </tr>
    </table>`;
}

export function escapeEmailHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeEmailAttribute(text: string): string {
  return escapeEmailHtml(text).replace(/`/g, "&#096;");
}
