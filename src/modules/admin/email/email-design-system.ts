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

const toneMap: Record<EmailShellTone, {
  accent: string;
  accentSoft: string;
  accentText: string;
  border: string;
}> = {
  default: {
    accent: "#2563eb",
    accentSoft: "#eff6ff",
    accentText: "#1d4ed8",
    border: "#bfdbfe",
  },
  invite: {
    accent: "#4f46e5",
    accentSoft: "#eef2ff",
    accentText: "#4338ca",
    border: "#c7d2fe",
  },
  reminder: {
    accent: "#dc2626",
    accentSoft: "#fef2f2",
    accentText: "#b91c1c",
    border: "#fecaca",
  },
  lifecycle: {
    accent: "#059669",
    accentSoft: "#ecfdf5",
    accentText: "#047857",
    border: "#a7f3d0",
  },
  warning: {
    accent: "#d97706",
    accentSoft: "#fffbeb",
    accentText: "#b45309",
    border: "#fde68a",
  },
};

export function buildEmailShell(options: EmailShellOptions): string {
  const tone = toneMap[options.tone ?? "default"];
  const footerHtml = options.footerHtml ?? `
    <p style="margin:0;font-size:11px;line-height:1.8;color:#94a3b8;text-align:center;">
      Để tắt email thông báo, vào <strong>Cài đặt &rarr; Thông báo</strong>.<br>
      To disable email notifications, go to <strong>Settings &rarr; Notifications</strong>.<br>
      &copy; 2026 FairPay
    </p>`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeEmailHtml(options.title)}</title>
  <style>
    @media only screen and (max-width: 640px) {
      .email-shell { padding: 16px 8px !important; }
      .email-card { border-radius: 16px !important; }
      .email-brand { padding: 20px 18px !important; }
      .email-body { padding: 22px 18px !important; }
      .email-panel { padding: 0 14px !important; }
      .group-card { padding: 0 14px !important; }
      .group-header-table,
      .group-header-table tbody,
      .group-header-table tr,
      .group-header-table td {
        display: block !important;
        width: 100% !important;
      }
      .group-header-avatar { padding-bottom: 10px !important; }
      .group-header-amount {
        padding-top: 10px !important;
        text-align: left !important;
      }
      .cta-link {
        box-sizing: border-box !important;
        display: block !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">
    ${escapeEmailHtml(options.previewText)}
  </div>
  <table class="email-shell" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table class="email-card" data-email-shell="maily-inspired" width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #dbe3ef;border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,0.14);">
          ${options.heroHtml ?? ""}
          <tr>
            <td class="email-brand" data-email-block="brand-header" style="padding:28px 32px;background:#ffffff;border-bottom:1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="vertical-align:top;">
                    <div style="font-size:12px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${tone.accentText};font-weight:800;">${escapeEmailHtml(options.eyebrow)}</div>
                    <div style="margin-top:10px;font-size:30px;line-height:1.12;font-weight:800;color:#0f172a;">${escapeEmailHtml(options.heading)}</div>
                    ${options.subheading ? `<div style="margin-top:10px;font-size:14px;line-height:1.7;color:#475569;">${escapeEmailHtml(options.subheading)}</div>` : ""}
                  </td>
                  <td align="right" style="width:96px;vertical-align:top;">
                    <div aria-label="FairPay" style="display:inline-block;border:1px solid ${tone.border};background:${tone.accentSoft};border-radius:14px;padding:10px 12px;font-size:14px;font-weight:800;color:${tone.accentText};">
                      FairPay
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-body" data-email-block="message-body" style="background:#ffffff;padding:32px;">
              ${options.bodyHtml}
              <div data-email-block="primary-cta" style="text-align:center;margin-top:30px;">
                <a href="${escapeEmailHtml(options.ctaHref)}" class="cta-link" style="display:inline-block;background:${tone.accent};color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:800;">
                  ${escapeEmailHtml(options.ctaLabel)}
                </a>
              </div>
              <div data-email-block="footer" style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:20px;">
                ${footerHtml}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEmailPanel(options: EmailPanelOptions): string {
  const tone = toneMap[options.tone ?? "default"];

  return `<table class="email-panel" data-email-block="${escapeEmailHtml(options.marker ?? "content-panel")}" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:18px;border:1px solid ${tone.border};border-radius:16px;background:${tone.accentSoft};padding:0 18px;">
    <tr>
      <td style="padding:18px 0;">
        ${options.label ? `<div style="font-size:12px;line-height:1.4;color:${tone.accentText};text-transform:uppercase;letter-spacing:0.08em;font-weight:800;">${escapeEmailHtml(options.label)}</div>` : ""}
        ${options.title ? `<div style="margin-top:${options.label ? "6px" : "0"};font-size:22px;line-height:1.2;font-weight:900;color:#0f172a;">${escapeEmailHtml(options.title)}</div>` : ""}
        ${options.description ? `<div style="margin-top:8px;font-size:13px;line-height:1.7;color:#475569;">${escapeEmailHtml(options.description)}</div>` : ""}
        ${options.bodyHtml ?? ""}
      </td>
    </tr>
  </table>`;
}

export function buildEmailKeyValueRows(rows: Array<{ label: string; value: string }>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:14px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;padding:0 16px;">
    ${rows.map((row) => `
      <tr>
        <td style="padding:12px 0;border-top:1px solid #eef2f7;font-size:13px;line-height:1.5;color:#64748b;">${escapeEmailHtml(row.label)}</td>
        <td align="right" style="padding:12px 0;border-top:1px solid #eef2f7;font-size:14px;line-height:1.5;color:#0f172a;font-weight:800;">${escapeEmailHtml(row.value)}</td>
      </tr>`).join("")}
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
