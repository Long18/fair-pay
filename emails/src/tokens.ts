import type { EmailTone } from "./types";

// accent      = pill badges, CTA button, links
// accentSoft  = header gradient base, panel label bg
// accentText  = label text over accentSoft
// border      = card/panel outlines
export const toneMap: Record<EmailTone, {
  accent: string;
  accentSoft: string;
  accentText: string;
  border: string;
}> = {
  default: { accent: "#0ea5e9", accentSoft: "#e0f2fe", accentText: "#0284c7", border: "#bae6fd" },
  invite: { accent: "#8b5cf6", accentSoft: "#ede9fe", accentText: "#7c3aed", border: "#ddd6fe" },
  reminder: { accent: "#fb7185", accentSoft: "#ffe4e6", accentText: "#f43f5e", border: "#fecdd3" },
  lifecycle: { accent: "#34d399", accentSoft: "#d1fae5", accentText: "#10b981", border: "#a7f3d0" },
  warning: { accent: "#fb923c", accentSoft: "#ffedd5", accentText: "#f97316", border: "#fed7aa" },
};

/** Neutral palette for transactional emails; brand = FairPay sky with AA contrast for white CTA text. */
export const TRANSACTIONAL_COLORS = {
  page: "#f4f7fb",
  border: "#e2e8f0",
  text: "#0f172a",
  secondary: "#64748b",
  brand: toneMap.default.accentText,
};

export const FONT_STACK = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";

export const RESPONSIVE_CSS = `
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
}`;

export const TRANSACTIONAL_RESPONSIVE_CSS = `
@media only screen and (max-width: 640px) {
  .email-shell { padding: 10px 6px !important; }
  .email-card-tx { padding: 16px !important; border-radius: 12px !important; }
  .cta-link { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
}`;
