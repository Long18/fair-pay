export type EmailTone = "default" | "invite" | "reminder" | "lifecycle" | "warning";

export interface RenderedEmail {
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface ReminderDebtTransaction {
  description: string;
  amount: number;
  currency?: string | null;
  expenseDate?: string | null;
}

export interface ReminderDebtBreakdownItem {
  counterpartyKey?: string | null;
  counterpartyName: string;
  counterpartyEmail?: string | null;
  amount: number;
  currency?: string | null;
  transactions?: ReminderDebtTransaction[];
}

export interface ReminderGroupBreakdownItem {
  groupId?: string | null;
  groupName: string;
  groupAvatarUrl?: string | null;
  subtotalAmount: number;
  currency?: string | null;
  counterparties: ReminderDebtBreakdownItem[];
}

/** Static, admin-editable copy. `*Html` fields are rich-text fragments authored in the React Email editor. */
export interface InviteEmailContent {
  subject: string;
  previewText: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  bodyHtml: string;
  panelLabel: string;
  panelTitle: string;
  panelDescription: string;
  ctaLabel: string;
  fallbackLinkLabel: string;
  footerHtml: string;
  textSignature: string;
}

/** Vietnamese-only copy for the per-person debt reminder (`debt-reminder.static.json`). */
export interface DebtReminderCopy {
  subject: string;
  preheader: string;
  greeting: string;
  greetingNoName: string;
  guestTrustLine: string;
  guestTrustFallback: string;
  totalLabel: string;
  totalMeta: string;
  plainTextSummary: string;
  overflow: string;
  groupHintMore: string;
  unnamedCounterparty: string;
  ctaRegistered: string;
  ctaGuest: string;
  ctaGuestFallback: string;
  footerRegistered: string;
  footerGuest: string;
  footerGuestFallback: string;
  copyright: string;
  digestReminderBadge: string;
  digestReminderLink: string;
}

/** Snapshot captured at enqueue (`notifications.email_context`), camelCased. All new fields are optional for old rows. */
export interface ReminderContextInput {
  totalAmount?: number | null;
  debtBreakdown?: ReminderDebtBreakdownItem[];
  groupBreakdown?: ReminderGroupBreakdownItem[];
  primaryCurrency?: string | null;
  senderDisplayName?: string | null;
  primaryGroupName?: string | null;
  computedAt?: string | null;
}

export interface BuildReminderViewModelInput {
  context: ReminderContextInput;
  recipient: { name?: string | null; hasAccount: boolean };
  appUrl?: string;
  notificationCreatedAt?: string | null;
  /** True only when `/register` honors `next` and claims the invited email (Phase 0 V4 + V5). */
  guestCtaSupportsNext?: boolean;
  content?: Partial<DebtReminderCopy>;
  now?: Date;
}

export interface ReminderViewModelLine {
  key: string;
  name: string;
  amountMinor: number;
  amountLabel: string;
  groupHint: string | null;
  maskedEmail: string | null;
}

export type ReminderSkipReason = "multi_currency" | "zero_total";

export interface ReminderTotalMismatchWarning {
  type: "total_mismatch";
  snapshotMinor: number;
  computedMinor: number;
}

export interface ReminderViewModel {
  status: "ok" | "skip";
  reason?: ReminderSkipReason;
  currency: string;
  totalAmountMinor: number;
  totalAmount: number;
  totalLabel: string;
  counterpartyCount: number;
  lines: ReminderViewModelLine[];
  overflowCount: number;
  overflowLabel: string | null;
  namesPreview: string;
  asOfLabel: string;
  year: string;
  subject: string;
  preheader: string;
  greeting: string;
  trustLine: string | null;
  totalHeading: string;
  totalMeta: string;
  cta: { href: string; label: string };
  footer: string;
  copyright: string;
  variant: "registered" | "guest";
  warnings: ReminderTotalMismatchWarning[];
}

export interface InviteEmailInput {
  inviterName?: string | null;
  appUrl?: string;
  content?: Partial<InviteEmailContent>;
}

export type DebtReminderEmailContent = DebtReminderCopy;

/** The reminder email renders only from the enqueue snapshot; in-app `title`/`message` are never shown. */
export type DebtReminderEmailInput = BuildReminderViewModelInput;
