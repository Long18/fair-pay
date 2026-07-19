import { supabaseClient } from "@/utility/supabaseClient";
import type {
  ReminderDebtBreakdownItem,
  ReminderGroupBreakdownItem,
} from "@/modules/admin/email/reminder-email";
import type {
  AdminT,
  AttachUserEmailsResult,
  DebtBreakdownRow,
  DebtReminderRow,
  EmailOverviewResponse,
  EmailSendResult,
  GroupBreakdownRow,
  SendReminderResponse,
  UserEmailOption,
} from "./types";

export function randomBetweenMs(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export function waitMs(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
export function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatterCache.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    currencyFormatterCache.set(currency, formatter);
  }
  return formatter;
}

export function formatCurrency(value: number, currency = "VND"): string {
  return getCurrencyFormatter(currency).format(Math.abs(value));
}

export function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function buildReminderMessage(row: DebtReminderRow, tAdmin: AdminT): string {
  const summarySource = row.group_breakdown.length
    ? row.group_breakdown.map((group) => ({
        label: group.group_name,
        amount: group.subtotal_amount,
        currency: group.currency,
      }))
    : row.debt_breakdown.map((item) => ({
        label: item.counterparty_name,
        amount: item.amount,
        currency: item.currency,
      }));
  const breakdown = summarySource
    .slice(0, 5)
    .map((item) => `${item.label}: ${formatCurrency(item.amount, item.currency)}`)
    .join("; ");
  const detail = breakdown ? ` ${tAdmin("devtool.debtDetailPrefix", { details: breakdown })}` : "";

  return tAdmin("devtool.reminderBody", {
    name: row.full_name,
    amount: formatCurrency(row.total_i_owe),
    details: detail,
  });
}

export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("admin-session-missing");
  }
  return data.session.access_token;
}

export async function readApiResponse<T extends { success?: boolean; error?: string; message?: string }>(
  response: Response
): Promise<T> {
  const raw = await response.text();
  let payload: T;

  if (raw) {
    try {
      payload = JSON.parse(raw) as T;
    } catch {
      const detail = raw.trim().split("\n").filter(Boolean).slice(0, 2).join(" ");
      throw new Error(detail ? `${detail} (HTTP ${response.status})` : `HTTP ${response.status}`);
    }
  } else {
    payload = { success: response.ok } as T;
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  }

  return payload;
}

/**
 * Send only explicitly selected notification IDs through the edge function.
 * Do not call with an empty list; that would risk sending an old full queue.
 */
export async function sendEmailForNotificationIds(notificationIds: string[]): Promise<EmailSendResult> {
  if (!notificationIds.length) {
    throw new Error("at-least-one-notification");
  }
  const token = await getAccessToken();
  const response = await fetch("/api/admin/email/run-worker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ notification_ids: notificationIds }),
  });

  return readApiResponse<EmailSendResult>(response);
}

export async function fetchEmailOverview(): Promise<EmailOverviewResponse> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/email/overview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return readApiResponse<EmailOverviewResponse>(response);
}

export async function createReminderNotifications(
  rows: DebtReminderRow[],
  tAdmin: AdminT,
  recipientResolver?: (row: DebtReminderRow) => string[]
): Promise<string[]> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/email/send-reminder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      reminders: rows.map((row) => ({
        user_id: row.user_id,
        title: tAdmin("devtool.messageTitle"),
        message: buildReminderMessage(row, tAdmin),
        link: row.has_auth_account ? "/dashboard" : "/register",
        recipient_emails: recipientResolver?.(row),
        email_context: {
          total_amount: row.total_i_owe,
          debt_breakdown: row.debt_breakdown.map((item) => ({
            counterparty_key: item.counterparty_key,
            counterparty_name: item.counterparty_name,
            counterparty_email: item.counterparty_email,
            amount: item.amount,
            currency: item.currency,
            direction: item.direction,
            transactions: item.transactions,
          })),
          group_breakdown: row.group_breakdown.map((group) => ({
            group_id: group.group_id,
            group_name: group.group_name,
            group_avatar_url: group.group_avatar_url,
            subtotal_amount: group.subtotal_amount,
            currency: group.currency,
            counterparties: group.counterparties.map((item) => ({
              counterparty_key: item.counterparty_key,
              counterparty_name: item.counterparty_name,
              counterparty_email: item.counterparty_email,
              amount: item.amount,
              currency: item.currency,
              direction: item.direction,
              transactions: item.transactions,
            })),
          })),
        },
      })),
    }),
  });

  const payload = await readApiResponse<SendReminderResponse>(response);

  return payload.notification_ids || [];
}

export function normalizeDebtRows(rows: unknown[], tAdmin: AdminT): DebtReminderRow[] {
  return rows.reduce<DebtReminderRow[]>((acc, row) => {
      const value = row as Record<string, unknown>;
      const userId = String(value.user_id || "");
      const primaryEmail = value.email ? String(value.email) : null;
      const rawEmails = Array.isArray(value.emails) ? value.emails : [];
      const emails = rawEmails.length
        ? rawEmails.reduce<{
            id: string;
            user_id: string;
            email: string;
            is_primary: boolean;
            receives_notifications: boolean;
            is_verified: boolean;
          }[]>((emailAcc, item) => {
            const email = item as Record<string, unknown>;
            const emailValue = String(email.email || "");
            if (emailValue) {
              emailAcc.push({
                id: String(email.id || email.email || ""),
                user_id: String(email.user_id || userId),
                email: emailValue,
                is_primary: email.is_primary === true,
                receives_notifications: email.receives_notifications !== false,
                is_verified: email.is_verified === true,
              });
            }
            return emailAcc;
          }, [])
        : primaryEmail
          ? [{
              id: primaryEmail,
              user_id: userId,
              email: primaryEmail,
              is_primary: true,
              receives_notifications: true,
              is_verified: true,
            }]
          : [];
      const debtBreakdown = Array.isArray(value.debt_breakdown)
        ? value.debt_breakdown.reduce<{
            counterparty_key: string;
            counterparty_name: string;
            counterparty_email: string | null;
            amount: number;
            currency: string;
            direction: "user_owes_counterparty";
            transactions: {
              expense_id: string;
              description: string;
              amount: number;
              currency: string;
              expense_date: string | null;
            }[];
          }[]>((debtAcc, item) => {
            const debt = item as Record<string, unknown>;
            const transactions = Array.isArray(debt.transactions)
              ? debt.transactions.reduce<{
                  expense_id: string;
                  description: string;
                  amount: number;
                  currency: string;
                  expense_date: string | null;
                }[]>((txAcc, transaction) => {
                  const tx = transaction as Record<string, unknown>;
                  const expenseId = String(tx.expense_id || "");
                  const amount = Number(tx.amount || 0);
                  if (expenseId && amount > 0) {
                    txAcc.push({
                      expense_id: expenseId,
                      description: String(tx.description || tAdmin("devtool.fallbackExpense")),
                      amount,
                      currency: String(tx.currency || debt.currency || "VND"),
                      expense_date: tx.expense_date ? String(tx.expense_date) : null,
                    });
                  }
                  return txAcc;
                }, [])
              : [];

            const counterpartyKey = String(debt.counterparty_key || "");
            const amount = Number(debt.amount || 0);
            if (counterpartyKey && amount > 0) {
              debtAcc.push({
                counterparty_key: counterpartyKey,
                counterparty_name: String(debt.counterparty_name || tAdmin("common.unknown")),
                counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
                amount,
                currency: String(debt.currency || "VND"),
                direction: "user_owes_counterparty" as const,
                transactions,
              });
            }
            return debtAcc;
          }, [])
        : [];
      const groupBreakdown = Array.isArray(value.group_breakdown)
        ? value.group_breakdown.reduce<{
            group_id: string | null;
            group_name: string;
            group_avatar_url: string | null;
            subtotal_amount: number;
            currency: string;
            counterparties: {
              counterparty_key: string;
              counterparty_name: string;
              counterparty_email: string | null;
              amount: number;
              currency: string;
              direction: "user_owes_counterparty";
              transactions: {
                expense_id: string;
                description: string;
                amount: number;
                currency: string;
                expense_date: string | null;
              }[];
            }[];
          }[]>((groupAcc, item) => {
            const group = item as Record<string, unknown>;
            const currency = String(group.currency || "VND");
            const counterparties = Array.isArray(group.counterparties)
              ? group.counterparties.reduce<{
                  counterparty_key: string;
                  counterparty_name: string;
                  counterparty_email: string | null;
                  amount: number;
                  currency: string;
                  direction: "user_owes_counterparty";
                  transactions: {
                    expense_id: string;
                    description: string;
                    amount: number;
                    currency: string;
                    expense_date: string | null;
                  }[];
                }[]>((counterpartyAcc, counterparty) => {
                  const debt = counterparty as Record<string, unknown>;
                  const transactions = Array.isArray(debt.transactions)
                    ? debt.transactions.reduce<{
                        expense_id: string;
                        description: string;
                        amount: number;
                        currency: string;
                        expense_date: string | null;
                      }[]>((txAcc, transaction) => {
                        const tx = transaction as Record<string, unknown>;
                        const expenseId = String(tx.expense_id || "");
                        const amount = Number(tx.amount || 0);
                        if (expenseId && amount > 0) {
                          txAcc.push({
                            expense_id: expenseId,
                            description: String(tx.description || tAdmin("devtool.fallbackExpense")),
                            amount,
                            currency: String(tx.currency || debt.currency || currency),
                            expense_date: tx.expense_date ? String(tx.expense_date) : null,
                          });
                        }
                        return txAcc;
                      }, [])
                    : [];

                  const counterpartyKey = String(debt.counterparty_key || "");
                  const amount = Number(debt.amount || 0);
                  if (counterpartyKey && amount > 0) {
                    counterpartyAcc.push({
                      counterparty_key: counterpartyKey,
                      counterparty_name: String(debt.counterparty_name || tAdmin("common.unknown")),
                      counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
                      amount,
                      currency: String(debt.currency || currency),
                      direction: "user_owes_counterparty" as const,
                      transactions,
                    });
                  }
                  return counterpartyAcc;
                }, [])
              : [];

            const subtotalAmount = Number(group.subtotal_amount || 0);
            if (subtotalAmount > 0 && counterparties.length > 0) {
              groupAcc.push({
                group_id: group.group_id ? String(group.group_id) : null,
                group_name: String(group.group_name || tAdmin("devtool.directGroup")),
                group_avatar_url: group.group_avatar_url ? String(group.group_avatar_url) : null,
                subtotal_amount: subtotalAmount,
                currency,
                counterparties,
              });
            }
            return groupAcc;
          }, [])
        : [];

      const totalIOwe = Number(value.total_i_owe || 0);
      if (userId && totalIOwe > 0) {
        acc.push({
          user_id: userId,
          full_name: String(value.full_name || tAdmin("common.unknown")),
          email: emails.find((email) => email.is_primary)?.email ?? primaryEmail ?? emails[0]?.email ?? null,
          emails,
          avatar_url: value.avatar_url ? String(value.avatar_url) : null,
          has_auth_account: value.has_auth_account !== false,
          total_i_owe: totalIOwe,
          net_balance: Number(value.net_balance || 0),
          active_debt_relationships: Number(value.active_debt_relationships || 0),
          debt_breakdown: debtBreakdown,
          group_breakdown: groupBreakdown,
        });
      }
      return acc;
    }, []);
}

export async function attachUserEmails(rows: DebtReminderRow[]): Promise<AttachUserEmailsResult> {
  const userIds = Array.from(
    new Set(rows.flatMap((row) => (row.user_id ? [row.user_id] : []))),
  );
  if (!userIds.length) return { rows };

  const { data, error } = await supabaseClient
    .from("user_emails")
    .select("id, user_id, email, is_primary, receives_notifications, is_verified")
    .in("user_id", userIds)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[admin/email] Failed to load user_emails", error);
    return { rows, warning: error.message };
  }

  const byUser = new Map<string, UserEmailOption[]>();
  for (const item of (data ?? []) as UserEmailOption[]) {
    const current = byUser.get(item.user_id) ?? [];
    current.push(item);
    byUser.set(item.user_id, current);
  }

  return {
    rows: rows.map((row) => {
    const emails = byUser.get(row.user_id) ?? row.emails;
    const email = emails.find((item) => item.is_primary)?.email ?? row.email ?? emails[0]?.email ?? null;
    return { ...row, email, emails };
    }),
  };
}

export function getSelectedRecipientEmails(
  row: DebtReminderRow,
  recipientSelections: Record<string, string[]>
): string[] {
  const validEmails = new Set(row.emails.map((email) => email.email.toLowerCase()));
  const selected = (recipientSelections[row.user_id] ?? []).filter((email) => validEmails.has(email.toLowerCase()));
  if (selected.length) return selected;

  const fallback = row.emails.find((email) => email.is_primary)?.email ?? row.email ?? row.emails[0]?.email;
  return fallback ? [fallback] : [];
}

export function formatRecipientEmails(
  row: DebtReminderRow,
  recipientSelections: Record<string, string[]>
): string {
  return getSelectedRecipientEmails(row, recipientSelections).join(", ") || row.email || "No recipient email";
}

export function toReminderDebtBreakdown(items: DebtBreakdownRow[]): ReminderDebtBreakdownItem[] {
  return items.map((item) => ({
    counterpartyName: item.counterparty_name,
    counterpartyEmail: item.counterparty_email,
    amount: item.amount,
    currency: item.currency,
    transactions: item.transactions.map((transaction) => ({
      description: transaction.description,
      amount: transaction.amount,
      currency: transaction.currency,
      expenseDate: transaction.expense_date,
    })),
  }));
}

export function toReminderGroupBreakdown(items: GroupBreakdownRow[]): ReminderGroupBreakdownItem[] {
  return items.map((group) => ({
    groupId: group.group_id,
    groupName: group.group_name,
    groupAvatarUrl: group.group_avatar_url,
    subtotalAmount: group.subtotal_amount,
    currency: group.currency,
    counterparties: toReminderDebtBreakdown(group.counterparties),
  }));
}
