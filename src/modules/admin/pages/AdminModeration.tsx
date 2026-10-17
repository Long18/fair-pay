import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";
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
import {
  Loader2Icon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  XCircleIcon,
  RefreshCwIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { onButtonKeyDown } from "@/lib/a11y-keyboard";
import { useAdminTranslation } from "../i18n";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTableScroll } from "../components/AdminTableScroll";
import { AdminMasterDetail } from "../components/AdminMasterDetail";
import {
  AdminMobileCard,
  AdminMobileCards,
} from "../components/AdminMobileCards";
import { useRowKeyboardNav } from "../hooks/use-row-keyboard-nav";

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

function ReportTargetBadges({
  row,
  tAdmin,
}: {
  row: ContentReportRow;
  tAdmin: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant="outline">
        {tAdmin(`moderation.targetType.${row.target_type}`)}
      </Badge>
      {row.target_banned ? (
        <Badge variant="destructive">{tAdmin("moderation.banned")}</Badge>
      ) : null}
    </span>
  );
}

type TFn = (key: string, options?: Record<string, unknown>) => string;

function reporterLabel(row: ContentReportRow) {
  return row.reporter_name ?? row.reporter_email ?? row.reporter_id;
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function ReportDetail({ row, tAdmin }: { row: ContentReportRow; tAdmin: TFn }) {
  return (
    <div className="space-y-3">
      <section className="space-y-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {tAdmin("moderation.columns.reason")}
        </h3>
        <p className="whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {row.reason}
        </p>
      </section>
      <dl className="divide-y">
        <DetailField label={tAdmin("moderation.columns.target")}>
          <span className="flex flex-col gap-1">
            <span className="font-medium">{row.target_label}</span>
            <ReportTargetBadges row={row} tAdmin={tAdmin} />
          </span>
        </DetailField>
        <DetailField label={tAdmin("layout.devtool.targetId")}>
          <span className="break-all font-mono text-xs">{row.target_id}</span>
        </DetailField>
        <DetailField label={tAdmin("moderation.columns.reporter")}>
          <span className="flex flex-col">
            <span>{row.reporter_name ?? row.reporter_id}</span>
            {row.reporter_email ? (
              <span className="text-xs text-muted-foreground">{row.reporter_email}</span>
            ) : null}
          </span>
        </DetailField>
        <DetailField label={tAdmin("layout.devtool.reportedAt")}>
          {formatDate(row.created_at, DATE_FORMAT)}
        </DetailField>
        <DetailField label={tAdmin("layout.devtool.reportId")}>
          <span className="break-all font-mono text-xs text-muted-foreground">{row.id}</span>
        </DetailField>
      </dl>
    </div>
  );
}

function QueueTable({
  rows,
  activeId,
  compact,
  onSelect,
  tAdmin,
}: {
  rows: ContentReportRow[];
  activeId: string | null;
  compact: boolean;
  onSelect: (row: ContentReportRow) => void;
  tAdmin: TFn;
}) {
  const headClass = "h-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
  return (
    <Table containerClassName="overflow-visible">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={headClass}>{tAdmin("moderation.columns.target")}</TableHead>
          <TableHead className={headClass}>{tAdmin("moderation.columns.reason")}</TableHead>
          {!compact && <TableHead className={headClass}>{tAdmin("moderation.columns.reporter")}</TableHead>}
          <TableHead className={headClass}>{tAdmin("common.createdAt")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const selected = row.id === activeId;
          return (
            <TableRow
              key={row.id}
              data-row-id={row.id}
              data-state={selected ? "selected" : undefined}
              aria-selected={selected}
              tabIndex={0}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[state=selected]:bg-primary/[0.07] data-[state=selected]:shadow-[inset_2px_0_0_var(--primary)]"
              onClick={() => onSelect(row)}
              onKeyDown={onButtonKeyDown(() => onSelect(row))}
            >
              <TableCell className="py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <ReportTargetBadges row={row} tAdmin={tAdmin} />
                  <span className="max-w-[12rem] truncate text-sm font-medium">{row.target_label}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[18rem] py-1.5">
                <p className="truncate text-sm text-muted-foreground">{row.reason}</p>
              </TableCell>
              {!compact && (
                <TableCell className="max-w-[12rem] truncate py-1.5 text-sm">{reporterLabel(row)}</TableCell>
              )}
              <TableCell className="whitespace-nowrap py-1.5 text-xs text-muted-foreground">
                {formatDate(row.created_at, DATE_FORMAT)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ModerationActionDialog({
  target,
  action,
  notes,
  onNotesChange,
  banTarget,
  onBanTargetChange,
  isPending,
  onClose,
  onConfirm,
  tAdmin,
}: {
  target: ContentReportRow | null;
  action: ReportAction | null;
  notes: string;
  onNotesChange: (v: string) => void;
  banTarget: boolean;
  onBanTargetChange: (v: boolean) => void;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tAdmin: TFn;
}) {
  return (
    <Dialog
      open={Boolean(target && action)}
      onOpenChange={(open) => {
        if (!open) onClose();
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
            {target
              ? tAdmin("moderation.actionDescription", {
                  target: target.target_label,
                  type: tAdmin(`moderation.targetType.${target.target_type}`),
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
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder={tAdmin("moderation.notesPlaceholder")}
              rows={3}
            />
          </div>
          {action === "resolve" && target?.target_type === "user" ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={banTarget}
                onCheckedChange={(checked) => onBanTargetChange(checked === true)}
              />
              {tAdmin("moderation.softBan")}
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {tAdmin("common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {action === "resolve" ? tAdmin("moderation.resolve") : tAdmin("moderation.dismiss")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportActions({
  onDismiss,
  onResolve,
  tAdmin,
}: {
  onDismiss: () => void;
  onResolve: () => void;
  tAdmin: TFn;
}) {
  return (
    <>
      <Button size="sm" variant="outline" onClick={onDismiss}>
        {tAdmin("moderation.dismiss")}
      </Button>
      <Button size="sm" onClick={onResolve}>
        <CheckCircle2Icon className="mr-1 h-4 w-4" />
        {tAdmin("moderation.resolve")}
      </Button>
    </>
  );
}

export function AdminModeration({ embedded = false }: { embedded?: boolean }) {
  const { tAdmin } = useAdminTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useOpenReports();

  /** Report shown in the detail pane */
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Report + action awaiting confirmation in the dialog */
  const [selected, setSelected] = useState<ContentReportRow | null>(null);
  const [action, setAction] = useState<ReportAction | null>(null);
  const [notes, setNotes] = useState("");
  const [banTarget, setBanTarget] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const rows = data?.data ?? [];
  const activeRow = activeId ? (rows.find((r) => r.id === activeId) ?? null) : null;
  const detailOpen = activeRow !== null;

  const openAction = (row: ContentReportRow, nextAction: ReportAction) => {
    setSelected(row);
    setAction(nextAction);
    setNotes("");
    setBanTarget(false);
  };

  const closeAction = () => {
    setSelected(null);
    setAction(null);
    setNotes("");
    setBanTarget(false);
  };

  const confirmAction = () => {
    if (!selected || !action) return;
    const index = rows.findIndex((r) => r.id === selected.id);
    const nextInQueue = rows[index + 1] ?? rows[index - 1] ?? null;
    const advance = activeId === selected.id;
    mutation.mutate(
      {
        reportId: selected.id,
        action,
        notes,
        banTarget: action === "resolve" && banTarget,
      },
      {
        onSuccess: () => {
          if (advance) setActiveId(nextInQueue?.id ?? null);
        },
      }
    );
  };

  useRowKeyboardNav({
    enabled: detailOpen && !action,
    rows,
    getId: (row) => row.id,
    selectedId: activeId,
    onSelect: (row) => setActiveId(row.id),
    containerRef: scrollRef,
  });

  const refreshButton = (
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={() => void refetch()}
      disabled={isFetching}
      aria-label={tAdmin("common.refresh")}
      title={tAdmin("common.refresh")}
    >
      <RefreshCwIcon className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
    </Button>
  );

  const master = isLoading ? (
    <div className="flex items-center justify-center gap-2 rounded-md border py-12 text-muted-foreground">
      <Loader2Icon className="h-5 w-5 animate-spin" />
      {tAdmin("common.loading")}
    </div>
  ) : isError ? (
    <Empty className="min-h-[200px] rounded-md border">
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
    <Empty className="min-h-[200px] rounded-md border">
      <EmptyMedia variant="icon">
        <ShieldCheckIcon className="h-6 w-6" />
      </EmptyMedia>
      <EmptyHeader>
        <EmptyTitle>{tAdmin("moderation.emptyTitle")}</EmptyTitle>
        <EmptyDescription>{tAdmin("moderation.emptyDescription")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ) : (
    <>
      <div className="md:hidden">
        <AdminMobileCards
          items={rows}
          getKey={(row) => row.id}
          renderItem={(row) => (
            <AdminMobileCard
              title={row.target_label}
              description={row.reason}
              badges={<ReportTargetBadges row={row} tAdmin={tAdmin} />}
              meta={[
                { label: tAdmin("moderation.columns.reporter"), value: reporterLabel(row) },
                { label: tAdmin("common.createdAt"), value: formatDate(row.created_at, DATE_FORMAT) },
              ]}
              onClick={() => setActiveId(row.id)}
              ariaLabel={row.target_label}
            />
          )}
        />
      </div>
      <AdminTableScroll
        ref={scrollRef}
        offset={embedded ? "12.75rem" : "16.75rem"}
        className="hidden md:block"
      >
        <QueueTable
          rows={rows}
          activeId={activeId}
          compact={detailOpen}
          onSelect={(row) => setActiveId(row.id)}
          tAdmin={tAdmin}
        />
      </AdminTableScroll>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {!embedded ? (
        <AdminPageHeader
          title={tAdmin("moderation.title")}
          description={tAdmin("moderation.description")}
          className="mb-1"
        />
      ) : null}

      <div className="flex h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{tAdmin("moderation.openQueue")}</h2>
          <Badge variant="secondary" className="tabular-nums">
            {tAdmin("moderation.openCount", { count: data?.total ?? 0 })}
          </Badge>
        </div>
        {refreshButton}
      </div>

      <AdminMasterDetail
        id="moderation"
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
        size="lg"
        title={activeRow?.target_label ?? tAdmin("layout.devtool.reportDetail")}
        description={activeRow ? <ReportTargetBadges row={activeRow} tAdmin={tAdmin} /> : undefined}
        footer={
          activeRow ? (
            <>
              <span className="mr-auto hidden text-[11px] text-muted-foreground xl:inline">
                {tAdmin("layout.devtool.keyboardHint")}
              </span>
              <ReportActions
                onDismiss={() => openAction(activeRow, "dismiss")}
                onResolve={() => openAction(activeRow, "resolve")}
                tAdmin={tAdmin}
              />
            </>
          ) : undefined
        }
        master={master}
        detail={activeRow ? <ReportDetail row={activeRow} tAdmin={tAdmin} /> : null}
      />

      <ModerationActionDialog
        target={selected}
        action={action}
        notes={notes}
        onNotesChange={setNotes}
        banTarget={banTarget}
        onBanTargetChange={setBanTarget}
        isPending={mutation.isPending}
        onClose={closeAction}
        onConfirm={confirmAction}
        tAdmin={tAdmin}
      />
    </div>
  );
}
