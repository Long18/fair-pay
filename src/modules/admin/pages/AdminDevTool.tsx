import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminOgPreview } from "./AdminOgPreview";
import { supabaseClient } from "@/utility/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2Icon,
  EyeIcon,
  Loader2Icon,
  MailIcon,
  RefreshCwIcon,
  SendIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";
import type { ReminderDebtBreakdownItem } from "@/modules/admin/email/reminder-email";

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

interface EmailWorkerResponse {
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

function buildReminderMessage(row: DebtReminderRow): string {
  const breakdown = row.debt_breakdown
    .slice(0, 5)
    .map((item) => `${item.counterparty_name}: ${formatCurrency(item.amount, item.currency)}`)
    .join("; ");
  const detail = breakdown ? ` Chi tiết: ${breakdown}.` : "";

  return `${row.full_name}, bạn đang có ${formatCurrency(row.total_i_owe)} cần thanh toán trên FairPay.${detail} Vui lòng kiểm tra dashboard và settle up khi có thể.`;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Không tìm thấy phiên đăng nhập admin");
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

async function runEmailWorker(body: Record<string, unknown> = {}): Promise<EmailWorkerResponse> {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/email/run-worker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return readApiResponse<EmailWorkerResponse>(response);
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

async function createReminderNotifications(rows: DebtReminderRow[]): Promise<string[]> {
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
        title: "Nhắc thanh toán công nợ",
        message: buildReminderMessage(row),
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

function normalizeDebtRows(rows: unknown[]): DebtReminderRow[] {
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
                    description: String(tx.description || "Chi phí"),
                    amount: Number(tx.amount || 0),
                    currency: String(tx.currency || debt.currency || "VND"),
                    expense_date: tx.expense_date ? String(tx.expense_date) : null,
                  };
                }).filter((transaction) => transaction.expense_id && transaction.amount > 0)
              : [];

            return {
              counterparty_key: String(debt.counterparty_key || ""),
              counterparty_name: String(debt.counterparty_name || "Không rõ"),
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
        full_name: String(value.full_name || "Không rõ"),
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
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-44" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-24" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
          <TableCell className="text-right"><Skeleton className="ml-auto h-9 w-28" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function WorkerResultCard({ result }: { result: EmailWorkerResponse | null }) {
  if (!result) return null;

  const hasErrors = (result.errors?.length || 0) > 0 || result.success === false;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        hasErrors
          ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {hasErrors ? <AlertTriangleIcon className="h-4 w-4" /> : <CheckCircle2Icon className="h-4 w-4" />}
        Email worker
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
  const { tap, success, warning } = useHaptics();
  const [debtors, setDebtors] = useState<DebtReminderRow[]>([]);
  const [pendingQueueCount, setPendingQueueCount] = useState<number | null>(null);
  const [pendingQueueError, setPendingQueueError] = useState<string | null>(null);
  const [workerResult, setWorkerResult] = useState<EmailWorkerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [previewRow, setPreviewRow] = useState<DebtReminderRow | null>(null);

  const previewEmail = useMemo(() => {
    if (!previewRow) return null;
    return buildReminderEmailPreview({
      userName: previewRow.full_name,
      title: "Nhắc thanh toán công nợ",
      message: buildReminderMessage(previewRow),
      debtBreakdown: toReminderDebtBreakdown(previewRow.debt_breakdown),
      totalAmount: previewRow.total_i_owe,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: "/dashboard",
    });
  }, [previewRow]);

  const totalDebtToRemind = useMemo(
    () => debtors.reduce((sum, row) => sum + row.total_i_owe, 0),
    [debtors]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setPendingQueueError(null);
    try {
      const overview = await fetchEmailOverview();
      setDebtors(normalizeDebtRows(overview.debtors || []));
      setPendingQueueCount(overview.pending_queue_count ?? 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được email devtool");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const handleRunWorker = useCallback(async () => {
    tap();
    setIsRunningWorker(true);
    try {
      const result = await runEmailWorker();
      setWorkerResult(result);
      success();
      toast.success(result.message || "Đã chạy email worker");
      refresh();
    } catch (error) {
      warning();
      toast.error(error instanceof Error ? error.message : "Email worker lỗi");
    } finally {
      setIsRunningWorker(false);
    }
  }, [refresh, success, tap, warning]);

  const handleRemindDebtor = useCallback(
    async (row: DebtReminderRow) => {
      tap();
      setSendingUserId(row.user_id);
      try {
        const ids = await createReminderNotifications([row]);
        if (!ids.length) throw new Error("Không tạo được notification nhắc nợ");

        const result = await runEmailWorker({ notification_ids: ids });
        setWorkerResult(result);
        success();
        toast.success(`Đã nhắc nợ ${row.full_name}`);
        refresh();
      } catch (error) {
        warning();
        toast.error(error instanceof Error ? error.message : "Không gửi được email nhắc nợ");
      } finally {
        setSendingUserId(null);
      }
    },
    [refresh, success, tap, warning]
  );

  const handleRemindAll = useCallback(async () => {
    if (!debtors.length) return;
    tap();
    setSendingUserId("__all__");
    try {
      const ids = await createReminderNotifications(debtors);
      if (!ids.length) throw new Error("Không tạo được notification nhắc nợ");

      const result = await runEmailWorker({ notification_ids: ids });
      setWorkerResult(result);
      success();
      toast.success(`Đã tạo ${ids.length} email nhắc nợ`);
      refresh();
    } catch (error) {
      warning();
      toast.error(error instanceof Error ? error.message : "Không gửi được email nhắc nợ");
    } finally {
      setSendingUserId(null);
    }
  }, [debtors, refresh, success, tap, warning]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email</h1>
          <p className="text-sm text-muted-foreground">Worker, queue, và nhắc nợ qua email.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { tap(); refresh(); }} disabled={isLoading}>
            {isLoading ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCwIcon className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button onClick={handleRunWorker} disabled={isRunningWorker}>
            {isRunningWorker ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <MailIcon className="mr-2 h-4 w-4" />}
            Run worker
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unsent queue</CardDescription>
            <CardTitle className="text-3xl">{pendingQueueCount ?? "—"}</CardTitle>
          </CardHeader>
          {pendingQueueError && (
            <CardContent>
              <p className="text-sm text-amber-600 dark:text-amber-400">{pendingQueueError}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Debtors with email</CardDescription>
            <CardTitle className="text-3xl">{debtors.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total to remind</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalDebtToRemind)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <WorkerResultCard result={workerResult} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Nhắc nợ</CardTitle>
            <CardDescription>Registered users whose dashboard-equivalent debt is greater than zero.</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleRemindAll}
            disabled={!debtors.length || sendingUserId !== null}
          >
            {sendingUserId === "__all__" ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            {sendingUserId === "__all__" ? "Đang gửi…" : "Nhắc tất cả"}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Đang nợ</TableHead>
                <TableHead className="text-right">Quan hệ nợ</TableHead>
                <TableHead className="w-[120px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <DebtTableSkeletonRows />
              ) : debtors.length ? (
                debtors.map((row) => {
                  const topDebt = row.debt_breakdown[0];

                  return (
                  <TableRow key={row.user_id}>
                    <TableCell className="min-w-0">
                      <div className="font-medium">{row.full_name}</div>
                      {topDebt ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Nợ {topDebt.counterparty_name} {formatCurrency(topDebt.amount, topDebt.currency)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{row.email}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatCurrency(row.total_i_owe)}</TableCell>
                    <TableCell className="text-right">{row.debt_breakdown.length || row.active_debt_relationships}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { tap(); setPreviewRow(row); }}
                        disabled={sendingUserId !== null}
                      >
                        {sendingUserId === row.user_id ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <EyeIcon className="mr-2 h-4 w-4" />}
                        {sendingUserId === row.user_id ? "Đang gửi…" : "Preview & Nhắc"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Không có user đang nợ với email hợp lệ
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={previewRow !== null} onOpenChange={(open) => !open && sendingUserId === null && setPreviewRow(null)}>
        <DialogContent className="max-w-3xl sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview email nhắc nợ</DialogTitle>
            <DialogDescription>
              {previewRow ? `Gửi tới ${previewRow.full_name} (${previewRow.email})` : null}
            </DialogDescription>
          </DialogHeader>
          {previewEmail && previewRow ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <p className="truncate font-medium">{previewEmail.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{previewEmail.previewText}</p>
              </div>
              {previewRow.debt_breakdown.length ? (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ai đang nợ ai
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {previewRow.debt_breakdown.slice(0, 4).map((item) => (
                      <div key={`${item.counterparty_key}-${item.currency}`} className="rounded-md bg-muted/40 p-3">
                        <p className="text-sm font-medium">
                          {previewRow.full_name} cần trả {item.counterparty_name}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-destructive tabular-nums">
                          {formatCurrency(item.amount, item.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="h-[420px] overflow-hidden rounded-md border bg-white sm:h-[520px]">
                <iframe
                  title="Reminder email preview"
                  srcDoc={previewEmail.html}
                  sandbox=""
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRow(null)} disabled={sendingUserId !== null}>
              Hủy
            </Button>
            <Button
              onClick={async () => {
                if (!previewRow) return;
                const row = previewRow;
                await handleRemindDebtor(row);
                setPreviewRow(null);
              }}
              disabled={sendingUserId !== null}
            >
              {sendingUserId === previewRow?.user_id ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="mr-2 h-4 w-4" />
              )}
              {sendingUserId === previewRow?.user_id ? "Đang gửi…" : "Gửi nhắc nợ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminDevTool() {
  return (
    <Tabs defaultValue="og-preview" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">DevTool</h1>
          <p className="text-sm text-muted-foreground">Admin utilities</p>
        </div>
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="og-preview">
            <EyeIcon className="h-4 w-4" />
            OG Preview
          </TabsTrigger>
          <TabsTrigger value="email">
            <MailIcon className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="og-preview">
        <AdminOgPreview />
      </TabsContent>
      <TabsContent value="email">
        <AdminEmailDevTools />
      </TabsContent>
    </Tabs>
  );
}
