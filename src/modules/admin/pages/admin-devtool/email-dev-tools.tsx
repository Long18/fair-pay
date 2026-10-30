import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EyeIcon,
  HistoryIcon,
  InfoIcon,
  Loader2Icon,
  RefreshCwIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { AdminEmptyState } from "../../components/AdminEmptyState";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { buildReminderEmailPreview, type ReminderEmailPreviewInput } from "@/modules/admin/email/reminder-email";
import { useRenderedEmail } from "@/modules/admin/email/use-rendered-email";
import { useAdminTranslation } from "../../i18n";
import { EmailDebtorsPanel } from "./email-debtors-panel";
import { EmailConfirmBulkDialog } from "./email-preview-dialogs";
import { EmailBulkPreviewPanel } from "./email-preview-panels";
import { ScheduledSendBanner, SendResultCard } from "./email-preview-ui";
import {
  attachUserEmails,
  buildReminderMessage,
  createReminderNotifications,
  fetchEmailOverview,
  formatCurrency,
  getSelectedRecipientEmails,
  isAbortError,
  normalizeDebtRows,
  partitionReminderRowsByCurrency,
  randomBetweenMs,
  sendEmailForNotificationIds,
  toReminderDebtBreakdown,
  toReminderGroupBreakdown,
  waitMs,
} from "./helpers";
import type {
  AdminT,
  DebtReminderRow,
  EmailSendResult,
  PreviewViewport,
  ScheduledSendState,
} from "./types";
import {
  STAGGER_DELAY_MAX_MS,
  STAGGER_DELAY_MIN_MS,
  UNDO_DELAY_MAX_MS,
  UNDO_DELAY_MIN_MS,
} from "./types";

type EmailToolTab = "recipients" | "preview" | "results";

function StatChip({ label, value, help }: { label: string; value: ReactNode; help?: string }) {
  return (
    <div className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      {help ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="-mr-1 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={help}
            >
              <InfoIcon className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3 text-xs text-muted-foreground">
            {help}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

function EmailToolTabsBar({
  tAdmin,
  isLoading,
  debtorsCount,
  selectedCount,
  sendResult,
  pendingQueueCount,
  totalDebtAll,
  onRefresh,
}: {
  tAdmin: AdminT;
  isLoading: boolean;
  debtorsCount: number;
  selectedCount: number;
  sendResult: EmailSendResult | null;
  pendingQueueCount: number | null;
  totalDebtAll: number;
  onRefresh: () => void;
}) {
  const sendResultHasErrors = sendResult
    ? (sendResult.errors?.length || 0) > 0 || sendResult.success === false
    : false;

  return (
    <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <TabsList className="max-w-full justify-start overflow-x-auto scrollbar-none">
        <TabsTrigger value="recipients" className="flex-none px-3 text-xs sm:text-sm">
          <UsersIcon className="h-4 w-4" aria-hidden="true" />
          {tAdmin("layout.devtoolTools.email.tabRecipients")}
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
            {isLoading ? "…" : debtorsCount}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="preview" className="flex-none px-3 text-xs sm:text-sm">
          <EyeIcon className="h-4 w-4" aria-hidden="true" />
          {tAdmin("layout.devtoolTools.email.tabPreview")}
          {selectedCount ? (
            <Badge className="h-5 px-1.5 text-[10px] tabular-nums">{selectedCount}</Badge>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="results" className="flex-none px-3 text-xs sm:text-sm">
          <HistoryIcon className="h-4 w-4" aria-hidden="true" />
          {tAdmin("layout.devtoolTools.email.tabResults")}
          {sendResult ? (
            <span
              className={cn(
                "size-2 rounded-full",
                sendResultHasErrors ? "bg-status-warning" : "bg-status-success"
              )}
              aria-hidden="true"
            />
          ) : null}
        </TabsTrigger>
      </TabsList>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatChip
          label={tAdmin("layout.devtoolTools.email.statQueue")}
          value={pendingQueueCount ?? "—"}
          help={tAdmin("devtool.pendingQueueHelp")}
        />
        <StatChip
          label={tAdmin("layout.devtoolTools.email.statTotal")}
          value={debtorsCount ? formatCurrency(totalDebtAll) : "—"}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label={tAdmin("common.refresh")}
        >
          {isLoading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="h-4 w-4" />
          )}
          <span className="ml-1.5 hidden sm:inline">{tAdmin("common.refresh")}</span>
        </Button>
      </div>
    </div>
  );
}

export function AdminEmailDevTools({ embedded = false }: { embedded?: boolean }) {
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
  const [activeTab, setActiveTab] = useState<EmailToolTab>("recipients");
  const [bulkPreviewFocusUserId, setBulkPreviewFocusUserId] = useState<string | null>(null);
  const [bulkPreviewViewport, setBulkPreviewViewport] = useState<PreviewViewport>("desktop");
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [groupFilter, setGroupFilter] = useState("all");
  const [recipientSelections, setRecipientSelections] = useState<Record<string, string[]>>({});
  const [scheduledSend, setScheduledSend] = useState<ScheduledSendState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const bulkAbortRef = useRef<AbortController | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  const previewEmailInput = useMemo<ReminderEmailPreviewInput | null>(() => {
    if (!previewRow) return null;
    return {
      userName: previewRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(previewRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(previewRow.debt_breakdown),
      groupBreakdown: toReminderGroupBreakdown(previewRow.group_breakdown),
      totalAmount: previewRow.total_i_owe,
      hasAuthAccount: previewRow.has_auth_account,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: previewRow.has_auth_account ? "/dashboard" : "/register",
    };
  }, [previewRow, tAdmin]);
  const previewEmail = useRenderedEmail(previewEmailInput, buildReminderEmailPreview);

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

  const selectedUserIdSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  const selectedRows = useMemo(
    () => visibleDebtors.filter((d) => selectedUserIdSet.has(d.user_id)),
    [visibleDebtors, selectedUserIdSet]
  );

  const effectiveBulkFocusRow = bulkFocusRow ?? selectedRows[0] ?? null;

  const bulkPreviewEmailInput = useMemo<ReminderEmailPreviewInput | null>(() => {
    if (!effectiveBulkFocusRow) return null;
    return {
      userName: effectiveBulkFocusRow.full_name,
      title: tAdmin("devtool.messageTitle"),
      message: buildReminderMessage(effectiveBulkFocusRow, tAdmin),
      debtBreakdown: toReminderDebtBreakdown(effectiveBulkFocusRow.debt_breakdown),
      groupBreakdown: toReminderGroupBreakdown(effectiveBulkFocusRow.group_breakdown),
      totalAmount: effectiveBulkFocusRow.total_i_owe,
      hasAuthAccount: effectiveBulkFocusRow.has_auth_account,
      appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
      link: effectiveBulkFocusRow.has_auth_account ? "/dashboard" : "/register",
    };
  }, [effectiveBulkFocusRow, tAdmin]);
  const bulkPreviewEmail = useRenderedEmail(bulkPreviewEmailInput, buildReminderEmailPreview);

  const allSelected = visibleDebtors.length > 0 && selectedRows.length === visibleDebtors.length;
  const someSelected = selectedRows.length > 0 && !allSelected;
  const isBulkScheduling =
    scheduledSend !== null &&
    scheduledSend.phase !== "done" &&
    scheduledSend.phase !== "cancelled";
  const isBusy = sendingUserId !== null || isBulkScheduling;

  const totalDebtAll = useMemo(() => debtors.reduce((sum, row) => sum + row.total_i_owe, 0), [debtors]);

  const totalDebtSelected = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.total_i_owe, 0),
    [selectedRows]
  );

  useEffect(() => {
    if (!scheduledSend?.deadlineMs) return;
    if (scheduledSend.phase !== "undo" && scheduledSend.phase !== "waiting") return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [scheduledSend?.deadlineMs, scheduledSend?.phase]);

  useEffect(() => {
    return () => {
      bulkAbortRef.current?.abort();
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

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
      if (partitionReminderRowsByCurrency([row]).excluded.length) {
        warning();
        toast.error(tAdmin("devtool.multiCurrencyBlocked", { name: row.full_name }));
        return;
      }
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
    setConfirmBulkOpen(false);

    const { eligible: rows, excluded } = partitionReminderRowsByCurrency(selectedRows);
    const excludedSuffix = excluded.length
      ? tAdmin("devtool.excludedMultiCurrency", { count: excluded.length })
      : "";
    const selectionsSnapshot = { ...recipientSelections };
    setSelectedUserIds([]);
    if (!rows.length) {
      warning();
      toast.error(`${tAdmin("devtool.sentMany", { count: 0 })}${excludedSuffix}`);
      return;
    }

    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    bulkAbortRef.current?.abort();
    const controller = new AbortController();
    bulkAbortRef.current = controller;
    const { signal } = controller;

    const undoMs = randomBetweenMs(UNDO_DELAY_MIN_MS, UNDO_DELAY_MAX_MS);
    setSendingUserId("__bulk__");
    setScheduledSend({
      phase: "undo",
      total: rows.length,
      currentIndex: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      deadlineMs: Date.now() + undoMs,
      currentName: rows[0]?.full_name ?? null,
      errors: [],
    });
    setNowMs(Date.now());

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    try {
      await waitMs(undoMs, signal);

      for (let i = 0; i < rows.length; i += 1) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");

        const row = rows[i];
        setScheduledSend({
          phase: "sending",
          total: rows.length,
          currentIndex: i,
          sent,
          failed,
          skipped,
          deadlineMs: null,
          currentName: row.full_name,
          errors: [...errors],
        });

        try {
          const ids = await createReminderNotifications(
            [row],
            tAdmin,
            (item) => getSelectedRecipientEmails(item, selectionsSnapshot)
          );
          if (!ids.length) throw new Error("queue-error");

          const result = await sendEmailForNotificationIds(ids);
          sent += result.sent ?? (result.success === false ? 0 : 1);
          failed += result.failed ?? (result.success === false ? 1 : 0);
          skipped += result.skipped ?? 0;
          if (result.errors?.length) errors.push(...result.errors);
          if (result.error) errors.push(result.error);
          if (result.success === false && !result.failed) failed += 1;
        } catch (rowError) {
          failed += 1;
          const message = rowError instanceof Error && rowError.message === "queue-error"
            ? tAdmin("devtool.queueError")
            : rowError instanceof Error
              ? rowError.message
              : tAdmin("devtool.sendError");
          errors.push(`${row.full_name}: ${message}`);
        }

        setScheduledSend({
          phase: "sending",
          total: rows.length,
          currentIndex: i,
          sent,
          failed,
          skipped,
          deadlineMs: null,
          currentName: row.full_name,
          errors: [...errors],
        });

        if (signal.aborted) throw new DOMException("Aborted", "AbortError");

        if (i < rows.length - 1) {
          const staggerMs = randomBetweenMs(STAGGER_DELAY_MIN_MS, STAGGER_DELAY_MAX_MS);
          setScheduledSend({
            phase: "waiting",
            total: rows.length,
            currentIndex: i + 1,
            sent,
            failed,
            skipped,
            deadlineMs: Date.now() + staggerMs,
            currentName: rows[i + 1].full_name,
            errors: [...errors],
          });
          setNowMs(Date.now());
          await waitMs(staggerMs, signal);
        }
      }

      const aggregate: EmailSendResult = {
        success: failed === 0,
        sent,
        failed,
        skipped,
        errors: errors.length ? errors : undefined,
      };
      setSendResult(aggregate);
      setScheduledSend({
        phase: "done",
        total: rows.length,
        currentIndex: rows.length,
        sent,
        failed,
        skipped,
        deadlineMs: null,
        currentName: null,
        errors: [...errors],
      });
      if (failed === 0) {
        success();
        toast.success(`${tAdmin("devtool.sentMany", { count: rows.length })}${excludedSuffix}`);
      } else {
        warning();
        toast.error(tAdmin("devtool.sentManyPartial", { sent, failed, total: rows.length }));
      }
      refresh();
      dismissTimerRef.current = window.setTimeout(() => {
        setScheduledSend((current) => (current?.phase === "done" ? null : current));
        dismissTimerRef.current = null;
      }, 5000);
    } catch (error) {
      if (isAbortError(error)) {
        setScheduledSend({
          phase: "cancelled",
          total: rows.length,
          currentIndex: Math.min(sent + failed, rows.length),
          sent,
          failed,
          skipped,
          deadlineMs: null,
          currentName: null,
          errors: [...errors],
        });
        if (sent > 0 || failed > 0) {
          setSendResult({
            success: failed === 0,
            sent,
            failed,
            skipped,
            errors: errors.length ? errors : undefined,
            message: tAdmin("devtool.sendUndone"),
          });
        }
        toast.message(tAdmin("devtool.sendUndone"));
        warning();
        refresh();
        dismissTimerRef.current = window.setTimeout(() => {
          setScheduledSend((current) => (current?.phase === "cancelled" ? null : current));
          dismissTimerRef.current = null;
        }, 4000);
        return;
      }

      warning();
      const message = error instanceof Error && error.message === "queue-error"
        ? tAdmin("devtool.queueError")
        : error instanceof Error && error.message === "at-least-one-notification"
          ? tAdmin("devtool.atLeastOneNotification")
          : error instanceof Error ? error.message : tAdmin("devtool.sendError");
      toast.error(message);
      setScheduledSend(null);
    } finally {
      setSendingUserId(null);
      if (bulkAbortRef.current === controller) {
        bulkAbortRef.current = null;
      }
    }
  }, [recipientSelections, selectedRows, refresh, success, tap, tAdmin, warning]);

  const cancelScheduledSend = useCallback(() => {
    tap();
    bulkAbortRef.current?.abort();
  }, [tap]);

  const openBulkPreview = useCallback(() => {
    if (!selectedRows.length) return;
    setBulkPreviewFocusUserId(selectedRows[0].user_id);
    setActiveTab("preview");
    tap();
  }, [selectedRows, tap]);

  return (
    <div className="space-y-3">
      {!embedded ? (
        <AdminPageHeader
          title={tAdmin("devtool.title")}
          description={tAdmin("devtool.subtitle")}
        />
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          tap();
          setActiveTab(value as EmailToolTab);
        }}
        className="gap-3"
      >
        <EmailToolTabsBar
          tAdmin={tAdmin}
          isLoading={isLoading}
          debtorsCount={debtors.length}
          selectedCount={selectedRows.length}
          sendResult={sendResult}
          pendingQueueCount={pendingQueueCount}
          totalDebtAll={totalDebtAll}
          onRefresh={() => {
            tap();
            refresh();
          }}
        />

        {pendingQueueError ? (
          <p className="text-xs text-[var(--status-warning-foreground)]">{pendingQueueError}</p>
        ) : null}

        {scheduledSend ? (
          <ScheduledSendBanner
            state={scheduledSend}
            nowMs={nowMs}
            onCancel={cancelScheduledSend}
            tAdmin={tAdmin}
          />
        ) : null}

        <TabsContent value="recipients">
          <EmailDebtorsPanel
            tAdmin={tAdmin}
            tap={tap}
            isLoading={isLoading}
            isBusy={isBusy}
            isBulkScheduling={isBulkScheduling}
            sendingUserId={sendingUserId}
            debtorsLength={debtors.length}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            setSelectedUserIds={setSelectedUserIds}
            groupOptions={groupOptions}
            selectedRows={selectedRows}
            visibleDebtors={visibleDebtors}
            totalDebtSelected={totalDebtSelected}
            allSelected={allSelected}
            someSelected={someSelected}
            selectedUserIdSet={selectedUserIdSet}
            recipientSelections={recipientSelections}
            setRecipientSelections={setRecipientSelections}
            openBulkPreview={openBulkPreview}
            setConfirmBulkOpen={setConfirmBulkOpen}
            previewRow={previewRow}
            setPreviewRow={setPreviewRow}
            previewEmail={previewEmail}
            previewViewport={previewViewport}
            setPreviewViewport={setPreviewViewport}
            handleRemindOne={handleRemindOne}
          />
        </TabsContent>

        <TabsContent value="preview">
          <EmailBulkPreviewPanel
            tAdmin={tAdmin}
            selectedRows={selectedRows}
            focusRow={effectiveBulkFocusRow}
            setFocusUserId={setBulkPreviewFocusUserId}
            viewport={bulkPreviewViewport}
            setViewport={setBulkPreviewViewport}
            email={bulkPreviewEmail}
            recipientSelections={recipientSelections}
            isBusy={isBusy}
            onConfirm={() => {
              tap();
              setConfirmBulkOpen(true);
            }}
            onGoToRecipients={() => setActiveTab("recipients")}
          />
        </TabsContent>

        <TabsContent value="results">
          {sendResult ? (
            <SendResultCard result={sendResult} />
          ) : (
            <AdminEmptyState
              icon={<HistoryIcon className="h-5 w-5" />}
              title={tAdmin("layout.devtoolTools.email.resultsEmptyTitle")}
              description={tAdmin("layout.devtoolTools.email.resultsEmptyBody")}
              className="rounded-lg border border-dashed py-6"
            />
          )}
        </TabsContent>
      </Tabs>

      <EmailConfirmBulkDialog
        tAdmin={tAdmin}
        sendingUserId={sendingUserId}
        selectedRows={selectedRows}
        recipientSelections={recipientSelections}
        confirmBulkOpen={confirmBulkOpen}
        setConfirmBulkOpen={setConfirmBulkOpen}
        handleRemindSelected={handleRemindSelected}
      />
    </div>
  );
}
