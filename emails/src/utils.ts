export const DEFAULT_APP_URL = "https://long-pay.vercel.app";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export type TemplateTokens = Record<string, string>;

/** Replaces `{{key}}` placeholders. Pass `escape` when the result is injected as raw HTML. */
export function fillTemplate(template: string, tokens: TemplateTokens, options?: { escape?: boolean }): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (!(key in tokens)) return match;
    return options?.escape ? escapeHtml(tokens[key]) : tokens[key];
  });
}

export function normalizeHref(appUrl: string, link: string): string {
  return `${appUrl.replace(/\/$/, "")}/${link.replace(/^\//, "")}`;
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(value: number, currency = "VND"): string {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 });
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter.format(Math.abs(value));
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormatter.format(date);
}

export function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "FP";
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

const RICH_TAG_STYLES: Record<string, string> = {
  p: "margin:0 0 10px;font-size:15px;line-height:1.75;color:#475569;",
  h1: "margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:800;color:#0f172a;",
  h2: "margin:0 0 10px;font-size:18px;line-height:1.35;font-weight:800;color:#0f172a;",
  h3: "margin:0 0 8px;font-size:16px;line-height:1.4;font-weight:700;color:#0f172a;",
  ul: "margin:0 0 10px;padding-left:20px;color:#475569;",
  ol: "margin:0 0 10px;padding-left:20px;color:#475569;",
  li: "margin:0 0 4px;font-size:15px;line-height:1.7;",
  a: "color:#4f46e5;text-decoration:none;font-weight:700;",
  strong: "color:#0f172a;",
};

/** Strips React Email editor scaffolding (node classes, container wrapper, empty styles) from `editor.getHTML()`. */
export function cleanEditorHtml(html: string): string {
  return html
    .replace(/^\s*<div data-type="container"[^>]*>([\s\S]*)<\/div>\s*$/i, "$1")
    .replace(/\sclass="node-[\w-]*"/gi, "")
    .replace(/\sstyle=""/gi, "")
    .replace(/<p><\/p>$/i, "");
}

/**
 * Editor fragments are trusted (committed JSON) but still pass through here so a pasted
 * script/handler can never reach a recipient, and tags get email-safe inline base styles.
 */
export function prepareRichHtml(html: string, tagStyles: Partial<Record<string, string>> = {}): string {
  const styles = { ...RICH_TAG_STYLES, ...tagStyles };
  return cleanEditorHtml(html)
    .replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"')
    .replace(/<(p|h1|h2|h3|ul|ol|li|a|strong)(\s[^>]*)?>/gi, (match, tag: string, attrs = "") => {
      const base = styles[tag.toLowerCase()];
      if (!base) return match;
      const existing = /\sstyle\s*=\s*"([^"]*)"/i.exec(attrs);
      if (!existing) return `<${tag}${attrs} style="${base}">`;
      return `<${tag}${attrs.replace(existing[0], ` style="${base}${existing[1]}"`)}>`;
    });
}
