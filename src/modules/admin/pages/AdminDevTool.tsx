import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { AdminOgPreview } from "./AdminOgPreview";
import { AdminUtmDevTool } from "./AdminUtmDevTool";
import { AdminApiDocs } from "./AdminApiDocs";
import { supabaseClient } from "@/utility/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Loader2Icon,
  MailIcon,
  PieChartIcon,
  RefreshCwIcon,
  SendIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";
import type { ReminderDebtBreakdownItem } from "@/modules/admin/email/reminder-email";
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

interface DebtReminderRow {
  user_id: string;
  full_name: string;
  email: string | null;
  total_i_owe: number;
  net_balance: number;
  active_debt_relationships: number;
  debt_breakdown: DebtBreakdownRow[];
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

interface SendReminderResponse {
  success: boolean;
  notification_ids?: string[];
  error?: string;
}

function formatCurrency(value: number, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

type AdminT = ReturnType<typeof useAdminTranslation>["tAdmin"];

function buildReminderMessage(row: DebtReminderRow, tAdmin: AdminT): string {
  const breakdown = row.debt_breakdown
    .slice(0, 5)
    .map((item) => `${item.counterparty_name}: ${formatCurrency(item.amount, item.currency)}`)
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

async function createReminderNotifications(rows: DebtReminderRow[], tAdmin: AdminT): Promise<string[]> {
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
        link: "/dashboard",
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
        },
      })),
    }),
  });

  const payload = await readApiResponse<SendReminderResponse>(response);

  return payload.notification_ids || [];
}

function normalizeDebtRows(rows: unknown[], tAdmin: AdminT): DebtReminderRow[] {
  return rows
    .map((row) => {
      const value = row as Record<string, unknown>;
      const debtBreakdown = Array.isArray(value.debt_breakdown)
        ? value.debt_breakdown.map((item) => {
            const debt = item as Record<string, unknown>;
            const transactions = Array.isArray(debt.transactions)
              ? debt.transactions.map((transaction) => {
                  const tx = transaction as Record<string, unknown>;
                  return {
                    expense_id: String(tx.expense_id || ""),
                    description: String(tx.description || tAdmin("devtool.fallbackExpense")),
                    amount: Number(tx.amount || 0),
                    currency: String(tx.currency || debt.currency || "VND"),
                    expense_date: tx.expense_date ? String(tx.expense_date) : null,
                  };
                }).filter((transaction) => transaction.expense_id && transaction.amount > 0)
              : [];

            return {
              counterparty_key: String(debt.counterparty_key || ""),
              counterparty_name: String(debt.counterparty_name || tAdmin("common.unknown")),
              counterparty_email: debt.counterparty_email ? String(debt.counterparty_email) : null,
              amount: Number(debt.amount || 0),
              currency: String(debt.currency || "VND"),
              direction: "user_owes_counterparty" as const,
              transactions,
            };
          }).filter((item) => item.counterparty_key && item.amount > 0)
        : [];

      return {
        user_id: String(value.user_id || ""),
        full_name: String(value.full_name || tAdmin("common.unknown")),
        email: value.email ? String(value.email) : null,
        total_i_owe: Number(value.total_i_owe || 0),
        net_balance: Number(value.net_balance || 0),
        active_debt_relationships: Number(value.active_debt_relationships || 0),
        debt_breakdown: debtBreakdown,
      };
    })
    .filter((row) => row.user_id && row.email && row.total_i_owe > 0);
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
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewFocusUserId, setBulkPreviewFocusUserId] = useState<string | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  const previewEmail = useMemo(() => {
    if (!previewRow) return null;
    return buildReminderEmailPreview({
      userName: previewRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(previewRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(previewRow.debt_breakdown),
      totalAmount: previewRow.total_i_owe,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: "/dashboard",
    });
  }, [previewRow, tAdmin]);

  const bulkFocusRow = useMemo(() => {
    if (!bulkPreviewFocusUserId) return null;
    return debtors.find((d) => d.user_id === bulkPreviewFocusUserId) ?? null;
  }, [debtors, bulkPreviewFocusUserId]);

  const bulkPreviewEmail = useMemo(() => {
    if (!bulkFocusRow) return null;
    return buildReminderEmailPreview({
      userName: bulkFocusRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(bulkFocusRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(bulkFocusRow.debt_breakdown),
      totalAmount: bulkFocusRow.total_i_owe,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: "/dashboard",
    });
  }, [bulkFocusRow, tAdmin]);

  const selectedRows = useMemo(
    () => debtors.filter((d) => selectedUserIds.includes(d.user_id)),
    [debtors, selectedUserIds]
  );

  const allSelected = debtors.length > 0 && selectedUserIds.length === debtors.length;
  const someSelected = selectedUserIds.length > 0 && !allSelected;
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
      setDebtors(normalizeDebtRows(overview.debtors || [], tAdmin));
      setPendingQueueCount(overview.pending_queue_count ?? 0);
    } catch (error) {
      const message = error instanceof Error && error.message === "admin-session-missing"
        ? tAdmin("devtool.missingAdminSession")
        : error instanceof Error ? error.message : tAdmin("devtool.loadError");
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

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => debtors.some((d) => d.user_id === id)));
  }, [debtors]);

  const handleRemindOne = useCallback(
    async (row: DebtReminderRow) => {
      tap();
      setSendingUserId(row.user_id);
      try {
        const ids = await createReminderNotifications([row], tAdmin);
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
    [refresh, success, tap, tAdmin, warning]
  );

  const handleRemindSelected = useCallback(async () => {
    if (!selectedRows.length) return;
    tap();
    setSendingUserId("__bulk__");
    try {
      const ids = await createReminderNotifications(selectedRows, tAdmin);
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
  }, [selectedRows, refresh, success, tap, tAdmin, warning]);

  const openBulkPreview = useCallback(() => {
    if (!selectedRows.length) return;
    setBulkPreviewFocusUserId(selectedRows[0].user_id);
    setBulkPreviewOpen(true);
    tap();
  }, [selectedRows, tap]);

  useEffect(() => {
    if (!bulkPreviewOpen) return;
    if (bulkFocusRow) return;
    if (selectedRows.length) {
      setBulkPreviewFocusUserId(selectedRows[0].user_id);
    }
  }, [bulkPreviewOpen, bulkFocusRow, selectedRows]);

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
            <div className="flex min-w-0 flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {tAdmin("devtool.selectedCount", { selected: selectedUserIds.length, total: debtors.length })}
                  {selectedRows.length ? ` · ${formatCurrency(totalDebtSelected)}` : ""}
                </span>
                <Separator orientation="vertical" className="hidden h-4 sm:block" />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto min-h-0 p-0"
                  onClick={() => {
                    tap();
                    setSelectedUserIds(debtors.map((d) => d.user_id));
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
                  disabled={!selectedUserIds.length}
                >
                  {tAdmin("devtool.clearSelection")}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openBulkPreview}
                  disabled={!selectedRows.length || isBusy}
                >
                  <EyeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {tAdmin("devtool.previewCount", { count: selectedUserIds.length })}
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
                          setSelectedUserIds(debtors.map((d) => d.user_id));
                        } else {
                          setSelectedUserIds([]);
                        }
                      }}
                      disabled={!debtors.length || isLoading}
                      aria-label={tAdmin("devtool.selectAllDebtors")}
                    />
                    <Label htmlFor="select-all-debtors" className="sr-only">
                      {tAdmin("devtool.selectAllDebtors")}
                    </Label>
                  </div>
                </TableHead>
                <TableHead>{tAdmin("devtool.userColumn")}</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.debtColumn")}</TableHead>
                <TableHead className="text-right">{tAdmin("devtool.relationshipsColumn")}</TableHead>
                <TableHead className="w-[200px] text-right">{tAdmin("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DebtTableSkeletonRows />
              ) : debtors.length ? (
                debtors.map((row) => {
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
                        <div className="font-medium">{row.full_name}</div>
                        {topDebt ? (
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {tAdmin("devtool.debtTo", { name: topDebt.counterparty_name, amount: formatCurrency(topDebt.amount, topDebt.currency) })}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="min-w-0 max-w-[min(100vw,220px)]">
                        <span className="line-clamp-2 break-words" translate="no">
                          {row.email}
                        </span>
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
                    {tAdmin("devtool.noDebtors")}
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
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.previewEmailTitle")}</DialogTitle>
            <DialogDescription>
              {previewRow ? tAdmin("devtool.sendTo", { name: previewRow.full_name, email: previewRow.email }) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {previewEmail && previewRow ? (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="max-w-full truncate font-medium" translate="no">
                    {previewEmail.subject}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{previewEmail.previewText}</p>
                </div>
                {previewRow.debt_breakdown.length ? (
                  <div className="rounded-xl border bg-card p-3 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {tAdmin("devtool.debtSummary")}
                    </p>
                    <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {previewRow.debt_breakdown.slice(0, 6).map((item) => (
                        <div
                          key={`${item.counterparty_key}-${item.currency}`}
                          className="rounded-lg bg-muted/40 p-3"
                        >
                          <p className="line-clamp-2 text-sm font-medium">
                            {tAdmin("devtool.debtSummaryLine", { user: previewRow.full_name, counterparty: item.counterparty_name })}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-destructive tabular-nums">
                            {formatCurrency(item.amount, item.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border bg-muted/40 p-2 shadow-sm sm:p-4">
                  <div className="mx-auto h-[min(62dvh,680px)] min-h-[360px] w-full overflow-hidden rounded-lg border bg-white shadow-sm sm:w-[640px]">
                    <iframe
                      title="Reminder email preview"
                      srcDoc={previewEmail.html}
                      sandbox=""
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </div>
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
        <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{tAdmin("devtool.bulkPreviewTitle")}</DialogTitle>
            <DialogDescription>
              {tAdmin("devtool.bulkPreviewDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
            {selectedRows.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="bulk-preview-user">{tAdmin("devtool.previewRecipient")}</Label>
                <Select
                  value={bulkPreviewFocusUserId || selectedRows[0]?.user_id}
                  onValueChange={setBulkPreviewFocusUserId}
                >
                  <SelectTrigger id="bulk-preview-user" className="w-full max-w-md">
                    <SelectValue placeholder={tAdmin("devtool.previewRecipient")} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRows.map((r) => (
                      <SelectItem key={r.user_id} value={r.user_id}>
                        {r.full_name} ({r.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {tAdmin("devtool.bulkPreviewHint", { count: selectedRows.length })}
                </p>
              </div>
            ) : null}
            {bulkPreviewEmail && bulkFocusRow ? (
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <p className="max-w-full truncate font-medium" translate="no">
                    {bulkPreviewEmail.subject}
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {bulkPreviewEmail.previewText}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/40 p-2 shadow-sm sm:p-4">
                  <div className="mx-auto h-[min(50dvh,560px)] min-h-[280px] w-full overflow-hidden rounded-lg border bg-white shadow-sm sm:w-[640px]">
                    <iframe
                      title="Bulk reminder email preview"
                      srcDoc={bulkPreviewEmail.html}
                      sandbox=""
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </div>
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
                        {r.full_name} — {r.email}
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
  const validTabs = ["og-preview", "email", "utm", ...(isApiDocsEnabled ? ["api-docs"] : [])] as const;
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
        <TabsList className={`grid w-full sm:w-fit ${isApiDocsEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
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
      {isApiDocsEnabled && (
        <TabsContent value="api-docs">
          <AdminApiDocs />
        </TabsContent>
      )}
    </Tabs>
  );
}
