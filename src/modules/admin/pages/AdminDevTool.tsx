import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AdminOgPreview } from "./AdminOgPreview";
import { AdminUtmDevTool } from "./AdminUtmDevTool";
import { AdminApiDocs } from "./AdminApiDocs";
import { AdminAuditLogs } from "./AdminAuditLogs";
import { AdminAgentOperations } from "./AdminAgentOperations";
import { supabaseClient } from "@/utility/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  EyeIcon,
  ListFilterIcon,
  Loader2Icon,
  MailIcon,
  MonitorIcon,
  PieChartIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  SendIcon,
  ZapIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";
import type {
  ReminderDebtBreakdownItem,
  ReminderGroupBreakdownItem,
} from "@/modules/admin/email/reminder-email";
import { useAdminTranslation } from "../i18n";

interface DebtTransactionRow {
  expense_id: string;
  description: string;
  amount: number;
  currency: string;
  expense_date: string | null;
}

interface DebtBreakdownRow {
  counterparty_key: string;
  counterparty_name: string;
  counterparty_email: string | null;
  amount: number;
  currency: string;
  direction: "user_owes_counterparty";
  transactions: DebtTransactionRow[];
}

interface GroupBreakdownRow {
  group_id: string | null;
  group_name: string;
  group_avatar_url: string | null;
  subtotal_amount: number;
  currency: string;
  counterparties: DebtBreakdownRow[];
}

interface UserEmailOption {
  id: string;
  user_id: string;
  email: string;
  is_primary: boolean;
  receives_notifications: boolean;
  is_verified: boolean;
}

interface DebtReminderRow {
  user_id: string;
  full_name: string;
  email: string | null;
  emails: UserEmailOption[];
  avatar_url: string | null;
  has_auth_account: boolean;
  total_i_owe: number;
  net_balance: number;
  active_debt_relationships: number;
  debt_breakdown: DebtBreakdownRow[];
  group_breakdown: GroupBreakdownRow[];
}

interface EmailSendResult {
  success: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

interface EmailOverviewResponse {
  success: boolean;
  pending_queue_count?: number;
  debtors?: unknown[];
  error?: string;
}

interface AttachUserEmailsResult {
  rows: DebtReminderRow[];
  warning?: string;
}

interface SendReminderResponse {
  success: boolean;
  notification_ids?: string[];
  error?: string;
}

type PreviewViewport = "desktop" | "mobile";

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();
function getCurrencyFormatter(currency: string): Intl.NumberFormat {
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

function formatCurrency(value: number, currency = "VND"): string {
  return getCurrencyFormatter(currency).format(Math.abs(value));
}

type AdminT = ReturnType<typeof useAdminTranslation>["tAdmin"];

function getInitials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function buildReminderMessage(row: DebtReminderRow, tAdmin: AdminT): string {
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

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("admin-session-missing");
  }
  return data.session.access_token;
}

async function readApiResponse<T extends { success?: boolean; error?: string; message?: string }>(
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
async function sendEmailForNotificationIds(notificationIds: string[]): Promise<EmailSendResult> {
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

async function fetchEmailOverview(): Promise<EmailOverviewResponse> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/email/overview", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return readApiResponse<EmailOverviewResponse>(response);
}

async function createReminderNotifications(
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

function normalizeDebtRows(rows: unknown[], tAdmin: AdminT): DebtReminderRow[] {
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

async function attachUserEmails(rows: DebtReminderRow[]): Promise<AttachUserEmailsResult> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
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

function getSelectedRecipientEmails(
  row: DebtReminderRow,
  recipientSelections: Record<string, string[]>
): string[] {
  const validEmails = new Set(row.emails.map((email) => email.email.toLowerCase()));
  const selected = (recipientSelections[row.user_id] ?? []).filter((email) => validEmails.has(email.toLowerCase()));
  if (selected.length) return selected;

  const fallback = row.emails.find((email) => email.is_primary)?.email ?? row.email ?? row.emails[0]?.email;
  return fallback ? [fallback] : [];
}

function formatRecipientEmails(
  row: DebtReminderRow,
  recipientSelections: Record<string, string[]>
): string {
  return getSelectedRecipientEmails(row, recipientSelections).join(", ") || row.email || "No recipient email";
}

function toReminderDebtBreakdown(items: DebtBreakdownRow[]): ReminderDebtBreakdownItem[] {
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

function toReminderGroupBreakdown(items: GroupBreakdownRow[]): ReminderGroupBreakdownItem[] {
  return items.map((group) => ({
    groupId: group.group_id,
    groupName: group.group_name,
    groupAvatarUrl: group.group_avatar_url,
    subtotalAmount: group.subtotal_amount,
    currency: group.currency,
    counterparties: toReminderDebtBreakdown(group.counterparties),
  }));
}

function RecipientIdentity({
  row,
  compact = false,
  showEmail = true,
  emailLabel,
  placeholderLabel,
}: {
  row: DebtReminderRow;
  compact?: boolean;
  showEmail?: boolean;
  emailLabel?: string;
  placeholderLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className={compact ? "size-8" : "size-10"}>
        <AvatarImage src={row.avatar_url ?? undefined} alt={row.full_name} />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(row.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium">{row.full_name}</span>
          {!row.has_auth_account ? (
            <Badge variant="secondary">{placeholderLabel}</Badge>
          ) : null}
        </div>
        {showEmail ? (
          <p className="truncate text-xs text-muted-foreground" translate="no">
            {emailLabel ?? row.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function RecipientEmailPicker({
  row,
  selectedEmails,
  onChange,
  disabled,
  tAdmin,
}: {
  row: DebtReminderRow;
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  disabled: boolean;
  tAdmin: AdminT;
}) {
  const selected = selectedEmails.length ? selectedEmails : getSelectedRecipientEmails(row, {});
  const selectedLabel = selected.length === 1
    ? selected[0]
    : tAdmin("devtool.selectedRecipientEmails", { count: selected.length });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-[220px] justify-start gap-2"
          disabled={disabled}
        >
          <MailIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate" translate="no">{selectedLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{tAdmin("devtool.chooseRecipientEmails")}</DropdownMenuLabel>
        {row.emails.map((email) => {
          const checked = selected.some((value) => value.toLowerCase() === email.email.toLowerCase());
          return (
            <DropdownMenuCheckboxItem
              key={email.id}
              checked={checked}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={(nextChecked) => {
                if (nextChecked) {
                  onChange(Array.from(new Set([...selected, email.email])));
                  return;
                }

                const next = selected.filter((value) => value.toLowerCase() !== email.email.toLowerCase());
                if (next.length) onChange(next);
              }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm" translate="no">{email.email}</p>
                {email.is_primary ? (
                  <p className="text-xs text-muted-foreground">{tAdmin("devtool.primaryEmail")}</p>
                ) : null}
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GroupIdentity({
  group,
}: {
  group: GroupBreakdownRow;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar className="size-8">
        <AvatarImage src={group.group_avatar_url ?? undefined} alt={group.group_name} />
        <AvatarFallback className="bg-indigo-100 text-[11px] font-semibold text-indigo-700">
          {getInitials(group.group_name)}
        </AvatarFallback>
      </Avatar>
      <p className="min-w-0 truncate text-sm font-medium leading-5">
        {group.group_name}
      </p>
    </div>
  );
}

function EmailPreviewViewportToggle({
  value,
  onChange,
  tAdmin,
}: {
  value: PreviewViewport;
  onChange: (value: PreviewViewport) => void;
  tAdmin: AdminT;
}) {
  return (
    <div className="inline-flex rounded-xl border bg-muted/40 p-1 shadow-xs">
      <Button
        type="button"
        size="sm"
        variant={value === "desktop" ? "secondary" : "ghost"}
        className="h-9 cursor-pointer rounded-lg"
        onClick={() => onChange("desktop")}
      >
        <MonitorIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {tAdmin("devtool.desktopPreview")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "mobile" ? "secondary" : "ghost"}
        className="h-9 cursor-pointer rounded-lg"
        onClick={() => onChange("mobile")}
      >
        <MailIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
        {tAdmin("devtool.mobilePreview")}
      </Button>
    </div>
  );
}

function EmailPreviewFrame({
  html,
  title,
  viewport,
  tall = false,
}: {
  html: string;
  title: string;
  viewport: PreviewViewport;
  tall?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-auto rounded-2xl border bg-slate-100 p-3 shadow-inner dark:bg-slate-950/40 sm:p-5">
      <div
        className={cn(
          "mx-auto w-full overflow-hidden rounded-2xl border bg-white shadow-xl ring-1 ring-slate-900/5 transition-[max-width] duration-200",
          viewport === "desktop" ? "max-w-[640px]" : "max-w-[390px]"
        )}
      >
        <div className="flex h-9 items-center justify-between border-b bg-slate-50 px-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-slate-500">
            {viewport === "desktop" ? "Desktop" : "Mobile"}
          </span>
        </div>
        <iframe
          title={title}
          srcDoc={html}
          sandbox=""
          className={cn(
            "block w-full bg-white",
            tall ? "h-[min(68dvh,760px)] min-h-[420px]" : "h-[min(58dvh,640px)] min-h-[320px]"
          )}
        />
      </div>
    </div>
  );
}

function DebtTableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell className="w-10">
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-44" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-24" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-4 w-16" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-9 w-24" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function SendResultCard({ result }: { result: EmailSendResult | null }) {
  const { tAdmin } = useAdminTranslation();
  if (!result) return null;

  const hasErrors = (result.errors?.length || 0) > 0 || result.success === false;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        hasErrors
          ? "border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]"
          : "border-[var(--status-success-bg)] bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]"
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {hasErrors ? <AlertTriangleIcon className="h-4 w-4" /> : <CheckCircle2Icon className="h-4 w-4" />}
        {tAdmin("devtool.resultTitle")}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge variant="outline">sent: {result.sent ?? 0}</Badge>
        <Badge variant="outline">failed: {result.failed ?? 0}</Badge>
        <Badge variant="outline">skipped: {result.skipped ?? 0}</Badge>
      </div>
      {result.message && <p className="mt-2">{result.message}</p>}
      {result.error && <p className="mt-2">{result.error}</p>}
      {result.errors?.length ? (
        <ul className="mt-2 space-y-1">
          {result.errors.slice(0, 3).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AdminEmailDevTools() {
  const { tAdmin } = useAdminTranslation();
  const { tap, success, warning } = useHaptics();
  const [debtors, setDebtors] = useState<DebtReminderRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pendingQueueCount, setPendingQueueCount] = useState<number | null>(null);
  const [pendingQueueError, setPendingQueueError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<EmailSendResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<DebtReminderRow | null>(null);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>("desktop");
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewFocusUserId, setBulkPreviewFocusUserId] = useState<string | null>(null);
  const [bulkPreviewViewport, setBulkPreviewViewport] = useState<PreviewViewport>("desktop");
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [recipientSelections, setRecipientSelections] = useState<Record<string, string[]>>({});

  const previewEmail = useMemo(() => {
    if (!previewRow) return null;
    return buildReminderEmailPreview({
      userName: previewRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(previewRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(previewRow.debt_breakdown),
      groupBreakdown: toReminderGroupBreakdown(previewRow.group_breakdown),
      totalAmount: previewRow.total_i_owe,
      hasAuthAccount: previewRow.has_auth_account,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: previewRow.has_auth_account ? "/dashboard" : "/register",
    });
  }, [previewRow, tAdmin]);

  const groupOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const row of debtors) {
      for (const group of row.group_breakdown) {
        const key = group.group_id ?? "__direct__";
        if (!options.has(key)) {
          options.set(key, group.group_name);
        }
      }
    }
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [debtors]);

  const visibleDebtors = useMemo(() => {
    if (groupFilter === "all") return debtors;

    return debtors.filter((row) => row.group_breakdown.some((group) => (
      (group.group_id ?? "__direct__") === groupFilter
    )));
  }, [debtors, groupFilter]);

  const bulkFocusRow = useMemo(() => {
    if (!bulkPreviewFocusUserId) return null;
    return visibleDebtors.find((d) => d.user_id === bulkPreviewFocusUserId) ?? null;
  }, [visibleDebtors, bulkPreviewFocusUserId]);

  const selectedRows = useMemo(
    () => visibleDebtors.filter((d) => selectedUserIds.includes(d.user_id)),
    [visibleDebtors, selectedUserIds]
  );

  const effectiveBulkFocusRow = bulkFocusRow ?? selectedRows[0] ?? null;

  const bulkPreviewEmail = useMemo(() => {
    if (!effectiveBulkFocusRow) return null;
    return buildReminderEmailPreview({
      userName: effectiveBulkFocusRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(effectiveBulkFocusRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(effectiveBulkFocusRow.debt_breakdown),
      groupBreakdown: toReminderGroupBreakdown(effectiveBulkFocusRow.group_breakdown),
      totalAmount: effectiveBulkFocusRow.total_i_owe,
      hasAuthAccount: effectiveBulkFocusRow.has_auth_account,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: effectiveBulkFocusRow.has_auth_account ? "/dashboard" : "/register",
    });
  }, [effectiveBulkFocusRow, tAdmin]);

  const allSelected = visibleDebtors.length > 0 && selectedRows.length === visibleDebtors.length;
  const someSelected = selectedRows.length > 0 && !allSelected;
  const isBusy = sendingUserId !== null;

  const totalDebtAll = useMemo(() => debtors.reduce((sum, row) => sum + row.total_i_owe, 0), [debtors]);

  const totalDebtSelected = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.total_i_owe, 0),
    [selectedRows]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setPendingQueueError(null);
    try {
      const overview = await fetchEmailOverview();
      const attached = await attachUserEmails(normalizeDebtRows(overview.debtors || [], tAdmin));
      const rows = attached.rows;
      setDebtors(rows);
      setPendingQueueError(attached.warning ? tAdmin("devtool.emailEnrichmentWarning") : null);
      setRecipientSelections((previous) => {
        const next: Record<string, string[]> = {};
        for (const row of rows) {
          const validEmails = new Set(row.emails.map((email) => email.email.toLowerCase()));
          const previousSelection = (previous[row.user_id] ?? [])
            .filter((email) => validEmails.has(email.toLowerCase()));
          next[row.user_id] = previousSelection.length
            ? previousSelection
            : getSelectedRecipientEmails(row, {});
        }
        return next;
      });
      setPendingQueueCount(overview.pending_queue_count ?? 0);
    } catch (error) {
      const message = error instanceof Error && error.message === "admin-session-missing"
        ? tAdmin("devtool.missingAdminSession")
        : error instanceof Error ? error.message : tAdmin("devtool.loadError");
      setDebtors([]);
      setPendingQueueError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [tAdmin]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const handleRemindOne = useCallback(
    async (row: DebtReminderRow) => {
      tap();
      setSendingUserId(row.user_id);
      try {
        const ids = await createReminderNotifications(
          [row],
          tAdmin,
          (item) => getSelectedRecipientEmails(item, recipientSelections)
        );
        if (!ids.length) throw new Error("queue-error");

        const result = await sendEmailForNotificationIds(ids);
        setSendResult(result);
        success();
        toast.success(tAdmin("devtool.sentOne", { name: row.full_name }));
        refresh();
      } catch (error) {
        warning();
        const message = error instanceof Error && error.message === "queue-error"
          ? tAdmin("devtool.queueError")
          : error instanceof Error && error.message === "at-least-one-notification"
            ? tAdmin("devtool.atLeastOneNotification")
            : error instanceof Error ? error.message : tAdmin("devtool.sendError");
        toast.error(message);
      } finally {
        setSendingUserId(null);
      }
    },
    [recipientSelections, refresh, success, tap, tAdmin, warning]
  );

  const handleRemindSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    tap();
    setSendingUserId("__bulk__");
    try {
      const ids = await createReminderNotifications(
        selectedRows,
        tAdmin,
        (row) => getSelectedRecipientEmails(row, recipientSelections)
      );
      if (!ids.length) throw new Error("queue-error");

      const result = await sendEmailForNotificationIds(ids);
      setSendResult(result);
      success();
      toast.success(tAdmin("devtool.sentMany", { count: ids.length }));
      setSelectedUserIds([]);
      setConfirmBulkOpen(false);
      refresh();
    } catch (error) {
      warning();
      const message = error instanceof Error && error.message === "queue-error"
        ? tAdmin("devtool.queueError")
        : error instanceof Error && error.message === "at-least-one-notification"
          ? tAdmin("devtool.atLeastOneNotification")
          : error instanceof Error ? error.message : tAdmin("devtool.sendError");
      toast.error(message);
    } finally {
      setSendingUserId(null);
    }
  }, [recipientSelections, selectedRows, refresh, success, tap, tAdmin, warning]);

  const openBulkPreview = useCallback(() => {
    if (!selectedRows.length) return;
    setBulkPreviewFocusUserId(selectedRows[0].user_id);
    setBulkPreviewOpen(true);
    tap();
  }, [selectedRows, tap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tAdmin("devtool.title")}</h1>
          <p className="text-sm text-muted-foreground text-pretty">{tAdmin("devtool.subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            tap();
            refresh();
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="mr-2 h-4 w-4" />
          )}
          {tAdmin("common.refresh")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tAdmin("devtool.pendingQueue")}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{pendingQueueCount ?? "—"}</CardTitle>
            <p className="pt-1 text-xs text-muted-foreground">
              {tAdmin("devtool.pendingQueueHelp")}
            </p>
          </CardHeader>
          {pendingQueueError && (
            <CardContent>
              <p className="text-sm text-[var(--status-warning-foreground)]">{pendingQueueError}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tAdmin("devtool.debtorsWithEmail")}</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{debtors.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{tAdmin("devtool.totalDebtAll")}</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-balance">
              {debtors.length ? formatCurrency(totalDebtAll) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <SendResultCard result={sendResult} />

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{tAdmin("devtool.debtorListTitle")}</CardTitle>
              <CardDescription>{tAdmin("devtool.debtorListDescription")}</CardDescription>
            </div>
          </div>
          {debtors.length > 0 && !isLoading ? (
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex items-center gap-2">
                  <ListFilterIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Label htmlFor="group-filter" className="sr-only">
                    {tAdmin("devtool.groupFilter")}
                  </Label>
                  <Select
                    value={groupFilter}
                    onValueChange={(value) => {
                      tap();
                      setGroupFilter(value);
                      setSelectedUserIds([]);
                    }}
                  >
                    <SelectTrigger id="group-filter" className="w-full sm:w-[220px]">
                      <SelectValue placeholder={tAdmin("devtool.groupFilter")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tAdmin("devtool.allGroups")}</SelectItem>
                      {groupOptions.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {tAdmin("devtool.selectedCount", { selected: selectedRows.length, total: visibleDebtors.length })}
                  {selectedRows.length ? ` · ${formatCurrency(totalDebtSelected)}` : ""}
                </span>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-0 p-0"
                  onClick={() => {
                    tap();
                    setSelectedUserIds(visibleDebtors.map((d) => d.user_id));
                  }}
                >
                  {tAdmin("common.all")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-0 p-0"
                  onClick={() => {
                    tap();
                    setSelectedUserIds([]);
                  }}
                  disabled={!selectedRows.length}
                >
                  {tAdmin("devtool.clearSelection")}
                </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openBulkPreview}
                  disabled={!selectedRows.length || isBusy}
                >
                  <EyeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {tAdmin("devtool.previewCount", { count: selectedRows.length })}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    tap();
                    setConfirmBulkOpen(true);
                  }}
                  disabled={!selectedRows.length || isBusy}
                >
                  {sendingUserId === "__bulk__" ? (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {tAdmin("devtool.sendSelectedEmail")}
                </Button>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-debtors"
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => {
                        if (checked === true) {
                          setSelectedUserIds(visibleDebtors.map((d) => d.user_id));
                        } else {
                          setSelectedUserIds([]);
                        }
                      }}
                      disabled={!visibleDebtors.length || isLoading}
                      aria-label={tAdmin("devtool.selectAllDebtors")}
                    />
                    <Label htmlFor="select-all-debtors" className="sr-only">
                      {tAdmin("devtool.selectAllDebtors")}
                    </Label>
                  </div>
                </TableHead>
                <TableHead>{tAdmin("devtool.userColumn")}</TableHead>
                <TableHead>{tAdmin("devtool.recipientEmails")}</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.debtColumn")}</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.relationshipsColumn")}</TableHead>
                <TableHead className="w-[200px] text-right">{tAdmin("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DebtTableSkeletonRows />
              ) : visibleDebtors.length ? (
                visibleDebtors.map((row) => {
                  const topGroup = row.group_breakdown[0];
                  const topDebt = row.debt_breakdown[0];
                  const rowSelected = selectedUserIds.includes(row.user_id);
                  return (
                    <TableRow key={row.user_id} data-state={rowSelected ? "selected" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`debtor-${row.user_id}`}
                            checked={rowSelected}
                            onCheckedChange={(checked) => {
                              setSelectedUserIds((prev) => {
                                if (checked === true) {
                                  if (prev.includes(row.user_id)) return prev;
                                  return [...prev, row.user_id];
                                }
                                return prev.filter((id) => id !== row.user_id);
                              });
                            }}
                            disabled={isBusy}
                            aria-label={`${tAdmin("common.select")} ${row.full_name}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0">
                        <RecipientIdentity
                          row={row}
                          compact
                          showEmail={false}
                          placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                        />
                        {topGroup ? (
                          <div className="mt-1 pl-11 text-xs text-muted-foreground line-clamp-2">
                            {tAdmin("devtool.topGroup", { name: topGroup.group_name, amount: formatCurrency(topGroup.subtotal_amount, topGroup.currency) })}
                          </div>
                        ) : topDebt ? (
                          <div className="mt-1 pl-11 text-xs text-muted-foreground line-clamp-2">
                            {tAdmin("devtool.debtTo", { name: topDebt.counterparty_name, amount: formatCurrency(topDebt.amount, topDebt.currency) })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[min(100vw,220px)]">
                        {row.emails.length > 1 ? (
                          <RecipientEmailPicker
                            row={row}
                            selectedEmails={recipientSelections[row.user_id] ?? []}
                            onChange={(emails) => {
                              setRecipientSelections((previous) => ({ ...previous, [row.user_id]: emails }));
                            }}
                            disabled={isBusy}
                            tAdmin={tAdmin}
                          />
                        ) : (
                          <span className="line-clamp-2 break-words" translate="no">
                            {formatRecipientEmails(row, recipientSelections)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(row.total_i_owe)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.debt_breakdown.length || row.active_debt_relationships}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              tap();
                              setPreviewRow(row);
                            }}
                            disabled={isBusy}
                            aria-label={`${tAdmin("common.preview")} ${row.full_name}`}
                          >
                            <EyeIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            {tAdmin("common.preview")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRemindOne(row)}
                            disabled={isBusy}
                            aria-label={`${tAdmin("devtool.sendReminder")} ${row.full_name}`}
                          >
                            {sendingUserId === row.user_id ? (
                              <Loader2Icon className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <SendIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            )}
                            {tAdmin("common.send")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {groupFilter === "all" ? tAdmin("devtool.noDebtors") : tAdmin("devtool.noDebtorsInGroup")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={previewRow !== null}
        onOpenChange={(open) => {
          if (!open && !isBusy) {
            setPreviewRow(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.previewEmailTitle")}</DialogTitle>
            <DialogDescription>
              {previewRow ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{tAdmin("devtool.sendTo", { name: previewRow.full_name, email: formatRecipientEmails(previewRow, recipientSelections) })}</span>
                  {!previewRow.has_auth_account ? (
                    <Badge variant="secondary">{tAdmin("devtool.placeholderRecipient")}</Badge>
                  ) : null}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            {previewEmail && previewRow ? (
              <>
                <aside className="min-h-0 space-y-4 overflow-y-auto border-b bg-muted/15 px-4 py-4 lg:border-r lg:border-b-0 sm:px-6">
                  <RecipientIdentity
                    row={previewRow}
                    emailLabel={formatRecipientEmails(previewRow, recipientSelections)}
                    placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                  />
                  <div className="rounded-xl border bg-background p-3 text-sm shadow-xs">
                    <p className="font-medium" translate="no">
                      {previewEmail.subject}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {previewEmail.previewText}
                    </p>
                  </div>
                  {previewRow.group_breakdown.length ? (
                    <div className="rounded-xl border bg-background p-3 shadow-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tAdmin("devtool.groupSummary")}
                      </p>
                      <div className="mt-3 space-y-2">
                        {previewRow.group_breakdown.slice(0, 6).map((group) => (
                          <div
                            key={`${group.group_id || group.group_name}-${group.currency}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2.5"
                          >
                            <GroupIdentity group={group} />
                            <p className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                              {formatCurrency(group.subtotal_amount, group.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : previewRow.debt_breakdown.length ? (
                    <div className="rounded-xl border bg-background p-3 shadow-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {tAdmin("devtool.debtSummary")}
                      </p>
                      <div className="mt-3 space-y-2">
                        {previewRow.debt_breakdown.slice(0, 6).map((item) => (
                          <div
                            key={`${item.counterparty_key}-${item.currency}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 p-2.5"
                          >
                            <p className="min-w-0 text-sm font-medium leading-5">
                              {item.counterparty_name}
                            </p>
                            <p className="shrink-0 text-sm font-semibold text-destructive tabular-nums">
                              {formatCurrency(item.amount, item.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </aside>
                <section className="flex min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      {tAdmin("devtool.previewViewport")}
                    </p>
                    <EmailPreviewViewportToggle
                      value={previewViewport}
                      onChange={setPreviewViewport}
                      tAdmin={tAdmin}
                    />
                  </div>
                  <EmailPreviewFrame
                    html={previewEmail.html}
                    title="Reminder email preview"
                    viewport={previewViewport}
                    tall
                  />
                </section>
              </>
            ) : null}
          </div>
          <DialogFooter className="border-t bg-background/95 px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewRow(null)}
              disabled={isBusy}
            >
              {tAdmin("common.close")}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!previewRow) return;
                const row = previewRow;
                await handleRemindOne(row);
                setPreviewRow(null);
              }}
              disabled={isBusy}
            >
              {sendingUserId === previewRow?.user_id ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {sendingUserId === previewRow?.user_id ? tAdmin("devtool.sending") : tAdmin("devtool.sendReminder")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkPreviewOpen} onOpenChange={setBulkPreviewOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:max-w-6xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.bulkPreviewTitle")}</DialogTitle>
            <DialogDescription>
              {tAdmin("devtool.bulkPreviewDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <aside className="min-h-0 space-y-4 overflow-y-auto border-b bg-muted/15 px-4 py-4 lg:border-r lg:border-b-0 sm:px-6">
              {selectedRows.length > 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="bulk-preview-user">{tAdmin("devtool.previewRecipient")}</Label>
                  <Select
                    value={effectiveBulkFocusRow?.user_id}
                    onValueChange={setBulkPreviewFocusUserId}
                  >
                    <SelectTrigger id="bulk-preview-user" className="w-full">
                      <SelectValue placeholder={tAdmin("devtool.previewRecipient")} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRows.map((r) => (
                        <SelectItem key={r.user_id} value={r.user_id}>
                          {r.full_name} ({formatRecipientEmails(r, recipientSelections)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {tAdmin("devtool.bulkPreviewHint", { count: selectedRows.length })}
                  </p>
                </div>
              ) : null}
              {effectiveBulkFocusRow ? (
                <RecipientIdentity
                  row={effectiveBulkFocusRow}
                  emailLabel={formatRecipientEmails(effectiveBulkFocusRow, recipientSelections)}
                  placeholderLabel={tAdmin("devtool.placeholderRecipient")}
                />
              ) : null}
              {bulkPreviewEmail ? (
                <div className="rounded-xl border bg-background p-3 text-sm shadow-xs">
                  <p className="font-medium" translate="no">
                    {bulkPreviewEmail.subject}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {bulkPreviewEmail.previewText}
                  </p>
                </div>
              ) : null}
            </aside>
            {bulkPreviewEmail && effectiveBulkFocusRow ? (
              <section className="flex min-h-0 flex-col gap-3 px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    {tAdmin("devtool.previewViewport")}
                  </p>
                  <EmailPreviewViewportToggle
                    value={bulkPreviewViewport}
                    onChange={setBulkPreviewViewport}
                    tAdmin={tAdmin}
                  />
                </div>
                <EmailPreviewFrame
                  html={bulkPreviewEmail.html}
                  title="Bulk reminder email preview"
                  viewport={bulkPreviewViewport}
                />
              </section>
            ) : null}
          </div>
          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button type="button" variant="outline" onClick={() => setBulkPreviewOpen(false)}>
              {tAdmin("common.close")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBulkPreviewOpen(false);
                setConfirmBulkOpen(true);
              }}
              disabled={!selectedRows.length}
            >
              {tAdmin("devtool.continueConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{tAdmin("devtool.confirmBulkTitle", { count: selectedRows.length })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{tAdmin("devtool.emailRecipients")}</p>
                <ScrollArea className="h-40 max-h-40 rounded-md border pr-2">
                  <ol className="list-inside list-decimal space-y-1 px-3 py-2 text-left text-sm">
                    {selectedRows.map((r) => (
                      <li key={r.user_id} className="min-w-0 break-words" translate="no">
                        {r.full_name} — {formatRecipientEmails(r, recipientSelections)}
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {tAdmin("devtool.confirmBulkDescription")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendingUserId === "__bulk__"}>{tAdmin("common.cancel")}</AlertDialogCancel>
            <Button
              type="button"
              disabled={sendingUserId === "__bulk__"}
              onClick={() => {
                void handleRemindSelected();
              }}
            >
              {sendingUserId === "__bulk__" ? tAdmin("devtool.sending") : tAdmin("devtool.sendEmail")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminDevTool() {
  const { tAdmin } = useAdminTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const isApiDocsEnabled = import.meta.env.VITE_ENABLE_ADMIN_API_DOCS === "true";
  const validTabs = ["og-preview", "email", "utm", "audit-logs", "agent-ops", ...(isApiDocsEnabled ? ["api-docs"] : [])] as const;
  const activeTab = validTabs.includes(requestedTab as typeof validTabs[number])
    ? (requestedTab as typeof validTabs[number])
    : "og-preview";
  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("devtool.developerToolsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{tAdmin("devtool.developerToolsSubtitle")}</p>
        </div>
        <TabsList className={`grid w-full sm:w-fit grid-cols-3 sm:grid-cols-${isApiDocsEnabled ? "6" : "5"}`}>
          <TabsTrigger value="og-preview">
            <EyeIcon className="h-4 w-4" />
            OG Preview
          </TabsTrigger>
          <TabsTrigger value="email">
            <MailIcon className="h-4 w-4" />
            {tAdmin("devtool.debtTab")}
          </TabsTrigger>
          <TabsTrigger value="utm">
            <PieChartIcon className="h-4 w-4" />
            UTM
          </TabsTrigger>
          <TabsTrigger value="audit-logs">
            <ScrollTextIcon className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="agent-ops">
            <ZapIcon className="h-4 w-4" />
            Agent Ops
          </TabsTrigger>
          {isApiDocsEnabled && (
            <TabsTrigger value="api-docs">
              <BookOpenIcon className="h-4 w-4" />
              API Docs
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="og-preview">
        <AdminOgPreview />
      </TabsContent>
      <TabsContent value="email">
        <AdminEmailDevTools />
      </TabsContent>
      <TabsContent value="utm">
        <AdminUtmDevTool />
      </TabsContent>
      <TabsContent value="audit-logs">
        <AdminAuditLogs />
      </TabsContent>
      <TabsContent value="agent-ops">
        <AdminAgentOperations />
      </TabsContent>
      {isApiDocsEnabled && (
        <TabsContent value="api-docs">
          <AdminApiDocs />
        </TabsContent>
      )}
    </Tabs>
  );
}
