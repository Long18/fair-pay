import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Loader2Icon, ShieldCheckIcon, CheckCircle2Icon, XCircleIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { useAdminTranslation } from "../i18n";
import { AdminPageHeader } from "../components/AdminPageHeader";

type ReportStatus = "open" | "resolved" | "dismissed";
type TargetType = "user" | "group";
type ReportAction = "resolve" | "dismiss";

interface ContentReportRow {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  target_type: TargetType;
  target_id: string;
  target_label: string;
  target_banned: boolean;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_by: string | null;
  resolver_name: string | null;
  notes: string | null;
}

interface ContentReportsResponse {
  data: ContentReportRow[];
  total: number;
  limit: number;
  offset: number;
}

const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

function useOpenReports() {
  return useQuery({
    queryKey: ["admin", "content-reports", "open"],
    queryFn: async () => {
      const { data, error } = await rpc("admin_list_content_reports", {
        p_status: "open",
        p_limit: 50,
        p_offset: 0,
      });
      if (error) throw error;
      return (data ?? { data: [], total: 0, limit: 50, offset: 0 }) as ContentReportsResponse;
    },
    refetchInterval: 30_000,
  });
}

export function AdminModeration() {
  const { tAdmin } = useAdminTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useOpenReports();

  const [selected, setSelected] = useState<ContentReportRow | null>(null);
  const [action, setAction] = useState<ReportAction | null>(null);
  const [notes, setNotes] = useState("");
  const [banTarget, setBanTarget] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: {
      reportId: string;
      action: ReportAction;
      notes: string;
      banTarget: boolean;
    }) => {
      const { data: result, error: rpcError } = await rpc("admin_action_content_report", {
        p_report_id: payload.reportId,
        p_action: payload.action,
        p_notes: payload.notes || null,
        p_ban_target: payload.banTarget,
      });
      if (rpcError) throw rpcError;
      return result;
    },
    onSuccess: () => {
      toast.success(tAdmin("moderation.actionSuccess"));
      setSelected(null);
      setAction(null);
      setNotes("");
      setBanTarget(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "content-reports"] });
    },
    onError: (err) => {
      toast.error(
        tAdmin("common.errorWithMessage", {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    },
  });

  const openAction = (row: ContentReportRow, nextAction: ReportAction) => {
    setSelected(row);
    setAction(nextAction);
    setNotes("");
    setBanTarget(false);
  };

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={tAdmin("moderation.title")}
        description={tAdmin("moderation.description")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              tAdmin("common.refresh")
            )}
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("moderation.openQueue")}</CardTitle>
          <CardDescription>
            {tAdmin("moderation.openCount", { count: data?.total ?? 0 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2Icon className="h-5 w-5 animate-spin" />
              {tAdmin("common.loading")}
            </div>
          ) : isError ? (
            <Empty>
              <EmptyMedia variant="icon">
                <XCircleIcon className="h-6 w-6 text-destructive" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>
                  {tAdmin("common.errorWithMessage", {
                    message: error instanceof Error ? error.message : "",
                  })}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : rows.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <ShieldCheckIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{tAdmin("moderation.emptyTitle")}</EmptyTitle>
                <EmptyDescription>{tAdmin("moderation.emptyDescription")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tAdmin("moderation.columns.target")}</TableHead>
                  <TableHead>{tAdmin("moderation.columns.reason")}</TableHead>
                  <TableHead>{tAdmin("moderation.columns.reporter")}</TableHead>
                  <TableHead>{tAdmin("common.createdAt")}</TableHead>
                  <TableHead className="text-right">{tAdmin("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {tAdmin(`moderation.targetType.${row.target_type}`)}
                          </Badge>
                          {row.target_banned ? (
                            <Badge variant="destructive">{tAdmin("moderation.banned")}</Badge>
                          ) : null}
                        </div>
                        <span className="text-sm font-medium">{row.target_label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <p className="text-sm line-clamp-2">{row.reason}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {row.reporter_name ?? row.reporter_email ?? row.reporter_id}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(row.created_at, DATE_FORMAT)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(row, "dismiss")}
                        >
                          {tAdmin("moderation.dismiss")}
                        </Button>
                        <Button size="sm" onClick={() => openAction(row, "resolve")}>
                          <CheckCircle2Icon className="mr-1 h-4 w-4" />
                          {tAdmin("moderation.resolve")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected && action)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setAction(null);
            setNotes("");
            setBanTarget(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "resolve"
                ? tAdmin("moderation.resolveTitle")
                : tAdmin("moderation.dismissTitle")}
            </DialogTitle>
            <DialogDescription>
              {selected
                ? tAdmin("moderation.actionDescription", {
                    target: selected.target_label,
                    type: tAdmin(`moderation.targetType.${selected.target_type}`),
                  })
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="moderation-notes">{tAdmin("moderation.notes")}</Label>
              <Textarea
                id="moderation-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={tAdmin("moderation.notesPlaceholder")}
                rows={3}
              />
            </div>
            {action === "resolve" && selected?.target_type === "user" ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={banTarget}
                  onCheckedChange={(checked) => setBanTarget(checked === true)}
                />
                {tAdmin("moderation.softBan")}
              </label>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setAction(null);
              }}
              disabled={mutation.isPending}
            >
              {tAdmin("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!selected || !action) return;
                mutation.mutate({
                  reportId: selected.id,
                  action,
                  notes,
                  banTarget: action === "resolve" && banTarget,
                });
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {action === "resolve"
                ? tAdmin("moderation.resolve")
                : tAdmin("moderation.dismiss")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
