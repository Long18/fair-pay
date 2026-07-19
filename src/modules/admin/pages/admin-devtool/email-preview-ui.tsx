import { useAdminTranslation } from "../../i18n";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  Loader2Icon,
  MailIcon,
  MonitorIcon,
  Undo2Icon,
} from "@/components/ui/icons";
import type { AdminT, EmailSendResult, PreviewViewport, ScheduledSendState } from "./types";

export function EmailPreviewViewportToggle({
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

export function EmailPreviewFrame({
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
            <span className="size-2.5 rounded-full bg-status-error" />
            <span className="size-2.5 rounded-full bg-status-warning" />
            <span className="size-2.5 rounded-full bg-status-success" />
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

export function DebtTableSkeletonRows() {
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

export function SendResultCard({ result }: { result: EmailSendResult | null }) {
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

export function ScheduledSendBanner({
  state,
  nowMs,
  onCancel,
  tAdmin,
}: {
  state: ScheduledSendState;
  nowMs: number;
  onCancel: () => void;
  tAdmin: AdminT;
}) {
  const secondsLeft = state.deadlineMs
    ? Math.max(0, Math.ceil((state.deadlineMs - nowMs) / 1000))
    : 0;
  const completed = state.sent + state.failed;
  const progressValue = state.total > 0 ? Math.round((completed / state.total) * 100) : 0;
  const canCancel = state.phase === "undo" || state.phase === "waiting" || state.phase === "sending";

  let title = tAdmin("devtool.scheduledProgress", {
    sent: completed,
    total: state.total,
  });
  let description = tAdmin("devtool.staggerHint");

  switch (state.phase) {
    case "undo":
      title = tAdmin("devtool.scheduledUndoTitle", { count: state.total });
      description = tAdmin("devtool.scheduledUndoDescription", { seconds: secondsLeft });
      break;
    case "sending":
      title = tAdmin("devtool.scheduledSending", {
        name: state.currentName ?? "",
        current: state.currentIndex + 1,
        total: state.total,
      });
      description = tAdmin("devtool.staggerHint");
      break;
    case "waiting":
      title = tAdmin("devtool.scheduledWaiting", {
        name: state.currentName ?? "",
        seconds: secondsLeft,
        sent: completed,
        total: state.total,
      });
      description = tAdmin("devtool.staggerHint");
      break;
    case "done":
      title = tAdmin("devtool.scheduledDone", {
        sent: state.sent,
        failed: state.failed,
      });
      description = state.failed
        ? tAdmin("devtool.scheduledDoneWithErrors")
        : tAdmin("devtool.scheduledDoneSuccess");
      break;
    case "cancelled":
      title = tAdmin("devtool.scheduledCancelled", {
        sent: state.sent,
        remaining: Math.max(0, state.total - completed),
      });
      description = tAdmin("devtool.sendUndone");
      break;
    default: {
      const _exhaustive: never = state.phase;
      void _exhaustive;
      break;
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 shadow-sm",
        state.phase === "cancelled"
          ? "border-border bg-muted/40"
          : state.phase === "done" && state.failed
            ? "border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)]"
            : state.phase === "done"
              ? "border-[var(--status-success-bg)] bg-[var(--status-success-bg)]"
              : "border-primary/20 bg-primary/5"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 font-medium">
            {state.phase === "sending" ? (
              <Loader2Icon className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : state.phase === "done" && !state.failed ? (
              <CheckCircle2Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : state.phase === "cancelled" ? (
              <Undo2Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <ClockIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span className="text-sm">{title}</span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        {canCancel ? (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onCancel}>
            <Undo2Icon className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {state.phase === "undo" ? tAdmin("devtool.undoSend") : tAdmin("devtool.cancelRemaining")}
          </Button>
        ) : null}
      </div>
      {state.phase !== "cancelled" ? (
        <Progress value={state.phase === "undo" ? 0 : progressValue} className="mt-3 h-1.5" />
      ) : null}
      {(state.phase === "undo" || state.phase === "waiting") && secondsLeft > 0 ? (
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {tAdmin("devtool.countdownSeconds", { seconds: secondsLeft })}
        </p>
      ) : null}
    </div>
  );
}
