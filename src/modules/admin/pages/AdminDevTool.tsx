import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminOgPreview } from "./AdminOgPreview";
import { supabaseClient } from "@/utility/supabaseClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface DebtReminderRow {
  user_id: string;
  full_name: string;
  email: string | null;
  total_i_owe: number;
  net_balance: number;
  active_debt_relationships: number;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
}

function buildReminderMessage(row: DebtReminderRow): string {
  return `${row.full_name}, bạn đang có ${formatCurrency(row.total_i_owe)} cần thanh toán trên FairPay. Vui lòng kiểm tra dashboard và settle up khi có thể.`;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Không tìm thấy phiên đăng nhập admin");
  }
  return data.session.access_token;
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

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as EmailWorkerResponse) : { success: response.ok };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  }

  return payload;
}

function normalizeDebtRows(rows: unknown[]): DebtReminderRow[] {
  return rows
    .map((row) => {
      const value = row as Record<string, unknown>;
      return {
        user_id: String(value.user_id || ""),
        full_name: String(value.full_name || "Không rõ"),
        email: value.email ? String(value.email) : null,
        total_i_owe: Number(value.total_i_owe || 0),
        net_balance: Number(value.net_balance || 0),
        active_debt_relationships: Number(value.active_debt_relationships || 0),
      };
    })
    .filter((row) => row.user_id && row.email && row.total_i_owe > 0);
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

  const totalDebtToRemind = useMemo(
    () => debtors.reduce((sum, row) => sum + row.total_i_owe, 0),
    [debtors]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setPendingQueueError(null);
    try {
      const [debtResult, queueResult] = await Promise.all([
        supabaseClient.rpc("get_all_users_debt_detailed", {
          p_limit: 100,
          p_offset: 0,
        }),
        supabaseClient
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("email_sent_at", null),
      ]);

      if (debtResult.error) {
        throw new Error(debtResult.error.message);
      }

      setDebtors(normalizeDebtRows((debtResult.data || []) as unknown[]));

      if (queueResult.error) {
        setPendingQueueError(queueResult.error.message);
        setPendingQueueCount(null);
      } else {
        setPendingQueueCount(queueResult.count ?? 0);
      }
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
        const { data, error } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: row.user_id,
            type: "settlement_reminder",
            title: "Nhắc thanh toán công nợ",
            message: buildReminderMessage(row),
            link: "/dashboard",
            is_read: false,
          })
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        if (!data?.id) throw new Error("Không lấy được notification id");

        const result = await runEmailWorker({ notification_ids: [data.id] });
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
      const { data, error } = await supabaseClient
        .from("notifications")
        .insert(
          debtors.map((row) => ({
            user_id: row.user_id,
            type: "settlement_reminder",
            title: "Nhắc thanh toán công nợ",
            message: buildReminderMessage(row),
            link: "/dashboard",
            is_read: false,
          }))
        )
        .select("id");

      if (error) throw new Error(error.message);

      const ids = (data || []).map((row) => row.id).filter(Boolean);
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
            <CardDescription>Registered users whose `total_i_owe` is greater than zero.</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={handleRemindAll}
            disabled={!debtors.length || sendingUserId !== null}
          >
            {sendingUserId === "__all__" ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            Nhắc tất cả
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
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2Icon className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : debtors.length ? (
                debtors.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_i_owe)}</TableCell>
                    <TableCell className="text-right">{row.active_debt_relationships}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleRemindDebtor(row)}
                        disabled={sendingUserId !== null}
                      >
                        {sendingUserId === row.user_id ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
                        Nhắc nợ
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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
