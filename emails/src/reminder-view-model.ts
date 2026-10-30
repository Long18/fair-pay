import debtReminderCopy from "./content/debt-reminder.static.json";
import type {
  BuildReminderViewModelInput,
  DebtReminderCopy,
  ReminderDebtBreakdownItem,
  ReminderGroupBreakdownItem,
  ReminderTotalMismatchWarning,
  ReminderViewModel,
  ReminderViewModelLine,
} from "./types";
import { DEFAULT_APP_URL, fillTemplate } from "./utils";

export const defaultDebtReminderCopy: DebtReminderCopy = debtReminderCopy;

export const REMINDER_VISIBLE_LINES = 5;
export const REMINDER_TIME_ZONE = "Asia/Ho_Chi_Minh";
const NBSP = "\u00a0";
const DEFAULT_CURRENCY = "VND";

const fractionDigitsCache = new Map<string, number>();
const moneyFormatterCache = new Map<string, Intl.NumberFormat>();

function fractionDigits(currency: string): number {
  let digits = fractionDigitsCache.get(currency);
  if (digits === undefined) {
    digits = new Intl.NumberFormat("vi-VN", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 0;
    fractionDigitsCache.set(currency, digits);
  }
  return digits;
}

export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(Math.abs(amount) * 10 ** fractionDigits(currency));
}

export function formatMoneyMinor(amountMinor: number, currency: string): string {
  let formatter = moneyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("vi-VN", { style: "currency", currency });
    moneyFormatterCache.set(currency, formatter);
  }
  return formatter.format(amountMinor / 10 ** fractionDigits(currency)).replace(/[\s\u202f]/g, NBSP);
}

const asOfFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: REMINDER_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour12: false,
});

export function formatAsOf(date: Date): { label: string; year: string } {
  const parts = asOfFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const hour = part("hour") === "24" ? "00" : part("hour");
  return { label: `${hour}:${part("minute")} ${part("day")}/${part("month")}`, year: part("year") };
}

export function maskEmail(email?: string | null): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return null;
  return `${trimmed.charAt(0)}***${trimmed.slice(at)}`;
}

function counterpartyKeyOf(item: ReminderDebtBreakdownItem): string {
  return item.counterpartyKey || item.counterpartyEmail?.toLowerCase() || item.counterpartyName || "unknown";
}

interface RawLine {
  key: string;
  name: string;
  email: string | null;
  currency: string;
  amountMinor: number;
}

/**
 * `debtBreakdown` is already netted per counterparty (same semantics as `/balances`).
 * Old snapshots without it fall back to summing group rows per counterparty.
 */
function collectRawLines(debts: ReminderDebtBreakdownItem[], groups: ReminderGroupBreakdownItem[]): RawLine[] {
  const source = debts.length
    ? debts.map((item) => ({ item, currency: item.currency || DEFAULT_CURRENCY }))
    : groups.flatMap((group) =>
        group.counterparties.map((item) => ({ item, currency: item.currency || group.currency || DEFAULT_CURRENCY })),
      );

  const byKey = new Map<string, RawLine>();
  for (const { item, currency } of source) {
    const key = `${counterpartyKeyOf(item)}|${currency}`;
    const existing = byKey.get(key);
    const amountMinor = toMinorUnits(item.amount || 0, currency);
    if (existing) {
      existing.amountMinor += amountMinor;
    } else {
      byKey.set(key, {
        key: counterpartyKeyOf(item),
        name: item.counterpartyName?.trim() || "",
        email: item.counterpartyEmail?.trim() || null,
        currency,
        amountMinor,
      });
    }
  }
  return Array.from(byKey.values()).filter((line) => line.amountMinor > 0);
}

function groupNamesByCounterparty(groups: ReminderGroupBreakdownItem[]): Map<string, string[]> {
  const ranked = new Map<string, Array<{ name: string; amount: number }>>();
  for (const group of groups) {
    if (!group.groupId || !group.groupName?.trim()) continue;
    for (const item of group.counterparties) {
      const key = counterpartyKeyOf(item);
      const list = ranked.get(key) ?? [];
      const existing = list.find((entry) => entry.name === group.groupName);
      if (existing) existing.amount += item.amount || 0;
      else list.push({ name: group.groupName.trim(), amount: item.amount || 0 });
      ranked.set(key, list);
    }
  }
  return new Map(
    Array.from(ranked, ([key, list]) => [
      key,
      list.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "vi")).map((entry) => entry.name),
    ]),
  );
}

function buildGroupHint(names: string[], copy: DebtReminderCopy): string | null {
  if (!names.length) return null;
  const visible = names.slice(0, 2).join(", ");
  return names.length > 2 ? `${visible} ${fillTemplate(copy.groupHintMore, { n: String(names.length - 2) })}` : visible;
}

function buildNamesPreview(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]}, ${names[1]}`;
  return `${names[0]}, ${names[1]} và ${names.length - 2} người khác`;
}

function buildCta(appUrl: string, hasAccount: boolean, guestCtaSupportsNext: boolean, copy: DebtReminderCopy) {
  const base = appUrl.replace(/\/$/, "");
  if (hasAccount) {
    return { href: `${base}/balances?${new URLSearchParams({ src: "email_reminder" })}`, label: copy.ctaRegistered };
  }
  if (guestCtaSupportsNext) {
    return {
      href: `${base}/register?${new URLSearchParams({ next: "/balances", src: "email_reminder" })}`,
      label: copy.ctaGuest,
    };
  }
  return { href: `${base}/register?${new URLSearchParams({ src: "email_reminder" })}`, label: copy.ctaGuestFallback };
}

function resolveAsOfDate(...candidates: Array<string | null | undefined | Date>): Date {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const date = candidate instanceof Date ? candidate : new Date(candidate);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

export function buildReminderViewModel(input: BuildReminderViewModelInput): ReminderViewModel {
  const copy: DebtReminderCopy = { ...defaultDebtReminderCopy, ...input.content };
  const appUrl = input.appUrl || DEFAULT_APP_URL;
  const hasAccount = input.recipient.hasAccount;
  const debts = input.context.debtBreakdown ?? [];
  const groups = input.context.groupBreakdown ?? [];

  const rawLines = collectRawLines(debts, groups);
  const currencies = new Set(rawLines.map((line) => line.currency));
  const currency = rawLines[0]?.currency || input.context.primaryCurrency || DEFAULT_CURRENCY;

  const nameCounts = rawLines.reduce<Map<string, number>>((acc, line) => {
    if (line.name) acc.set(line.name, (acc.get(line.name) ?? 0) + 1);
    return acc;
  }, new Map());
  const groupNames = groupNamesByCounterparty(groups);

  const sortedLines: ReminderViewModelLine[] = rawLines
    .map((line) => {
      const masked = maskEmail(line.email);
      const duplicateName = !!line.name && (nameCounts.get(line.name) ?? 0) > 1;
      const name = line.name || masked || copy.unnamedCounterparty;
      const groupHint = buildGroupHint(groupNames.get(line.key) ?? [], copy);
      const hintParts = [groupHint, duplicateName ? masked : null].filter((part): part is string => !!part);
      return {
        key: line.key,
        name,
        amountMinor: line.amountMinor,
        amountLabel: formatMoneyMinor(line.amountMinor, line.currency),
        groupHint: hintParts.length ? hintParts.join(" · ") : null,
        maskedEmail: duplicateName || !line.name ? masked : null,
      };
    })
    .sort((a, b) => b.amountMinor - a.amountMinor || a.name.localeCompare(b.name, "vi"));

  const totalAmountMinor = sortedLines.reduce((sum, line) => sum + line.amountMinor, 0);
  const counterpartyCount = sortedLines.length;
  const totalLabel = formatMoneyMinor(totalAmountMinor, currency);
  const asOf = formatAsOf(resolveAsOfDate(input.context.computedAt, input.notificationCreatedAt, input.now));
  const namesPreview = buildNamesPreview(sortedLines.map((line) => line.name));
  const overflowCount = Math.max(0, counterpartyCount - REMINDER_VISIBLE_LINES);
  const senderName = input.context.senderDisplayName?.trim() || "";
  const groupName = input.context.primaryGroupName?.trim() || "";
  const userName = input.recipient.name?.trim() || "";

  const tokens = {
    total: totalLabel,
    counterpartyCount: String(counterpartyCount),
    namesPreview,
    asOf: asOf.label,
    userName,
    senderName,
    groupName,
    year: asOf.year,
    n: String(overflowCount),
  };

  const warnings: ReminderTotalMismatchWarning[] = [];
  if (typeof input.context.totalAmount === "number" && input.context.totalAmount > 0) {
    const snapshotMinor = toMinorUnits(input.context.totalAmount, currency);
    if (snapshotMinor !== totalAmountMinor && currencies.size <= 1) {
      warnings.push({ type: "total_mismatch", snapshotMinor, computedMinor: totalAmountMinor });
    }
  }

  const status: ReminderViewModel["status"] = currencies.size > 1 || totalAmountMinor <= 0 ? "skip" : "ok";
  const reason = currencies.size > 1 ? "multi_currency" : totalAmountMinor <= 0 ? "zero_total" : undefined;

  return {
    status,
    reason,
    currency,
    totalAmountMinor,
    totalAmount: totalAmountMinor / 10 ** fractionDigits(currency),
    totalLabel,
    counterpartyCount,
    lines: sortedLines.slice(0, REMINDER_VISIBLE_LINES),
    overflowCount,
    overflowLabel: overflowCount > 0 ? fillTemplate(copy.overflow, tokens) : null,
    namesPreview,
    asOfLabel: asOf.label,
    year: asOf.year,
    subject: fillTemplate(copy.subject, tokens),
    preheader: fillTemplate(copy.preheader, tokens),
    greeting: userName ? fillTemplate(copy.greeting, tokens) : copy.greetingNoName,
    trustLine: hasAccount ? null : senderName && groupName ? fillTemplate(copy.guestTrustLine, tokens) : copy.guestTrustFallback,
    totalHeading: copy.totalLabel,
    totalMeta: fillTemplate(copy.totalMeta, tokens),
    cta: buildCta(appUrl, hasAccount, input.guestCtaSupportsNext === true, copy),
    footer: hasAccount ? copy.footerRegistered : senderName ? fillTemplate(copy.footerGuest, tokens) : copy.footerGuestFallback,
    copyright: fillTemplate(copy.copyright, tokens),
    variant: hasAccount ? "registered" : "guest",
    warnings,
  };
}

export function formatReminderPlainText(vm: ReminderViewModel, content?: Partial<DebtReminderCopy>): string {
  const copy: DebtReminderCopy = { ...defaultDebtReminderCopy, ...content };
  const summary = fillTemplate(copy.plainTextSummary, {
    total: vm.totalLabel,
    counterpartyCount: String(vm.counterpartyCount),
    asOf: vm.asOfLabel,
  });
  const lines = vm.lines.map((line) => `- ${line.name}: ${line.amountLabel}${line.groupHint ? ` (${line.groupHint})` : ""}`);

  return [
    vm.greeting,
    "",
    ...(vm.trustLine ? [vm.trustLine, ""] : []),
    summary,
    "",
    ...lines,
    ...(vm.overflowLabel ? [vm.overflowLabel] : []),
    "",
    `${vm.cta.label}: ${vm.cta.href}`,
    "",
    vm.footer,
  ].join("\n");
}
