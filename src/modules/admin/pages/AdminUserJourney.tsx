import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ActivityIcon,
  ArrowLeftIcon,
  ClockIcon,
  Loader2Icon,
  Trash2Icon,
  UserIcon,
} from "@/components/ui/icons";
import { JourneyCanvasView } from "../components/journey-canvas";
import { JourneyEventTimeline } from "../components/journey-canvas/JourneyEventTimeline";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { AdminMetricCard, AdminMetricGrid } from "../components/AdminMetricCard";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { useAdminTranslation } from "../i18n";
import type {
  AdminUserRow,
  DeleteTrackingResponse,
  PaginatedAdminResponse,
  UserTrackingEventRow,
  UserTrackingOverview,
  UserTrackingSessionRow,
} from "../types";

const JOURNEY_TABS = ["canvas", "timeline"] as const;

const EVENT_FILTER_OPTIONS = [
  { value: "all", labelKey: "journey.eventOptions.allEvents" },
  { value: "page_view", labelKey: "journey.eventOptions.pageView" },
  { value: "session_started", labelKey: "journey.eventOptions.sessionStarted" },
  { value: "nav_click", labelKey: "journey.eventOptions.navClick" },
  { value: "cta_click", labelKey: "journey.eventOptions.ctaClick" },
  { value: "form_step_view", labelKey: "journey.eventOptions.formStepView" },
  { value: "form_submit", labelKey: "journey.eventOptions.formSubmit" },
  { value: "form_success", labelKey: "journey.eventOptions.formSuccess" },
  { value: "form_error", labelKey: "journey.eventOptions.formError" },
  { value: "auth_login_success", labelKey: "journey.eventOptions.authLoginSuccess" },
  { value: "auth_signup_success", labelKey: "journey.eventOptions.authSignupSuccess" },
  { value: "expense_create_success", labelKey: "journey.eventOptions.expenseCreateSuccess" },
  { value: "settlement_completed", labelKey: "journey.eventOptions.settlementCompleted" },
  { value: "share_completed", labelKey: "journey.eventOptions.shareCompleted" },
  { value: "invite_sent", labelKey: "journey.eventOptions.inviteSent" },
  { value: "invite_accepted", labelKey: "journey.eventOptions.inviteAccepted" },
  { value: "dashboard_tab_changed", labelKey: "journey.eventOptions.dashboardTabChanged" },
  { value: "ai_chat_opened", labelKey: "journey.eventOptions.aiChatOpened" },
  { value: "billing_checkout_started", labelKey: "journey.eventOptions.billingCheckoutStarted" },
] as const;

const DELETE_TIME_RANGE_OPTIONS = [
  { value: "1h", labelKey: "journey.ranges.last1h" },
  { value: "24h", labelKey: "journey.ranges.last24h" },
  { value: "7d", labelKey: "journey.ranges.last7d" },
  { value: "30d", labelKey: "journey.ranges.last30d" },
  { value: "1y", labelKey: "journey.ranges.last1y" },
  { value: "all", labelKey: "journey.ranges.all" },
] as const;

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toIsoRangeStart(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

function toIsoRangeEnd(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAggregateLabel(rows: Array<{ name: string; count: number }>) {
  if (rows.length === 0) return "—";
  return rows.map((row) => `${row.name} (${row.count})`).join(", ");
}

export function AdminUserJourney() {
  const { tAdmin, locale } = useAdminTranslation();
  const { id: userId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useAdminTabParam("canvas", JOURNEY_TABS);
  const [dateFrom, setDateFrom] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 14);
    return toDateInput(value);
  });
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => searchParams.get("session") || "all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [rawEvent, setRawEvent] = useState<UserTrackingEventRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTimeRange, setDeleteTimeRange] = useState("all");

  const fromIso = toIsoRangeStart(dateFrom);
  const toIso = toIsoRangeEnd(dateTo);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["admin", "users", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_users");
      if (error) throw error;
      return ((data ?? []) as AdminUserRow[]).find((row) => row.id === userId) ?? null;
    },
    staleTime: 30_000,
  });

  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["admin", "tracking-overview", userId, fromIso, toIso],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_user_tracking_overview", {
        p_user_id: userId,
        p_from: fromIso,
        p_to: toIso,
      });
      if (error) throw error;
      return data as UserTrackingOverview;
    },
    staleTime: 15_000,
  });

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["admin", "tracking-sessions", userId, fromIso, toIso],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_user_tracking_sessions", {
        p_user_id: userId,
        p_from: fromIso,
        p_to: toIso,
        p_limit: 50,
        p_offset: 0,
      });
      if (error) throw error;
      return data as PaginatedAdminResponse<UserTrackingSessionRow>;
    },
    staleTime: 15_000,
  });

  const selectedEventNames = useMemo(() => (
    eventFilter === "all" ? null : [eventFilter]
  ), [eventFilter]);

  const resolvedSessionId = useMemo(() => {
    if (!sessions?.data?.length) return "all";
    if (selectedSessionId === "all") return "all";
    return sessions.data.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : "all";
  }, [selectedSessionId, sessions]);

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ["admin", "tracking-events", userId, resolvedSessionId, fromIso, toIso, eventFilter],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_user_tracking_events", {
        p_user_id: userId,
        p_session_id: resolvedSessionId !== "all" ? resolvedSessionId : null,
        p_from: fromIso,
        p_to: toIso,
        p_event_names: selectedEventNames,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return data as PaginatedAdminResponse<UserTrackingEventRow>;
    },
    staleTime: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (timeRange: string) => {
      const { data, error } = await supabaseClient.rpc("admin_delete_user_tracking", {
        p_user_id: userId,
        p_time_range: timeRange,
      });
      if (error) throw error;
      return data as unknown as DeleteTrackingResponse;
    },
    onSuccess: (result) => {
      toast.success(
        tAdmin("journey.deleted", {
          events: result.deleted_events,
          sessions: result.deleted_sessions,
        }),
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking-overview", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking-sessions", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "tracking-events", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "journey-graph", userId] });
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(tAdmin("journey.deleteError", { message: error.message }));
    },
  });

  const isLoading = isUserLoading || isOverviewLoading || isSessionsLoading || isEventsLoading;

  const selectedSession = useMemo(
    () => sessions?.data.find((session) => session.id === resolvedSessionId) ?? null,
    [resolvedSessionId, sessions?.data],
  );

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:text-foreground">
            <Link to="/admin/people">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              {tAdmin("journey.backToPeople")}
            </Link>
          </Button>
          <AdminPageHeader
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 p-2 text-primary">
                    <UserIcon className="h-5 w-5" />
                  </span>
                  {tAdmin("journey.titleForUser", { name: user?.full_name ?? tAdmin("common.user") })}
                </span>
                {user?.journey_tracking_ignored ? (
                  <Badge variant="outline">{tAdmin("status.ignored")}</Badge>
                ) : null}
              </span>
            }
            description={user?.email ?? tAdmin("journey.loadingUser")}
            actions={
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[160px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[160px]" />
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-full sm:w-[190px]">
                    <SelectValue placeholder={tAdmin("journey.eventFilterPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {tAdmin(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="shrink-0"
                >
                  <Trash2Icon className="mr-2 h-4 w-4" />
                  {tAdmin("journey.deleteData")}
                </Button>
              </div>
            }
          />
        </div>

        {/* Overview cards */}
        <AdminMetricGrid columns={4}>
          <AdminMetricCard
            variant="plain"
            label={tAdmin("journey.totalSessions")}
            value={overview?.total_sessions ?? 0}
            loading={isOverviewLoading}
            description={tAdmin("journey.firstSeen", { value: formatDateTime(overview?.first_seen_at, locale) })}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("journey.totalEvents")}
            value={overview?.total_events ?? 0}
            loading={isOverviewLoading}
            description={tAdmin("journey.uniquePages", { count: overview?.unique_pages ?? 0 })}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("journey.latestSource")}
            value={overview?.top_sources?.[0]?.name ?? "direct"}
            loading={isOverviewLoading}
            description={tAdmin("journey.lastSeen", { value: formatDateTime(overview?.last_seen_at, locale) })}
          />
          <AdminMetricCard
            variant="plain"
            label={tAdmin("journey.latestEntryLink")}
            value={
              <span className="break-all text-base font-semibold leading-snug">
                {overview?.latest_entry_link ?? "—"}
              </span>
            }
            loading={isOverviewLoading}
            description={tAdmin("journey.sources", { value: formatAggregateLabel(overview?.top_sources ?? []) })}
          />
        </AdminMetricGrid>

        {/* Tab toggle: Canvas / Timeline */}
        <AdminTabs
          value={activeTab}
          onValueChange={setActiveTab}
          items={[
            { value: "canvas", label: tAdmin("journey.canvasTab") },
            { value: "timeline", label: tAdmin("journey.timelineTab") },
          ]}
          listClassName="sm:grid-cols-2"
        >
          {/* Canvas tab */}
          <AdminTabsContent value="canvas">
            <JourneyCanvasView
              userId={userId}
              sessionId={resolvedSessionId}
              fromIso={fromIso}
              toIso={toIso}
              eventNames={selectedEventNames}
              sourceName={searchParams.get("source") || selectedSession?.landing_source || overview?.top_sources?.[0]?.name || null}
              entryLink={selectedSession?.entry_link ?? overview?.latest_entry_link ?? null}
              events={events?.data}
              eventsTotal={events?.total}
              eventsLoading={isEventsLoading}
              onViewRawEvent={setRawEvent}
            />
          </AdminTabsContent>

          {/* Timeline tab (existing view) */}
          <AdminTabsContent value="timeline">
            <div className="grid gap-4 xl:grid-cols-[360px,1fr]">
              <Card className="min-h-[480px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ActivityIcon className="h-4 w-4" />
                    {tAdmin("journey.sessionsTitle")}
                  </CardTitle>
                  <CardDescription>
                    {tAdmin("journey.selectSessionHint")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading && !sessions ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      {tAdmin("journey.loadingSessions")}
                    </div>
                  ) : sessions?.data?.length ? (
                    <ScrollArea className="h-[520px] pr-3">
                      <div className="space-y-3">
                        <Button
                          type="button"
                          variant={selectedSessionId === "all" ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => setSelectedSessionId("all")}
                        >
                          {tAdmin("journey.allSessions", { count: sessions.total })}
                        </Button>
                        {sessions.data.map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => setSelectedSessionId(session.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedSessionId === session.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-medium">{session.landing_path}</p>
                                <p className="text-xs text-muted-foreground">{session.landing_source}</p>
                              </div>
                              <Badge variant="secondary">{session.event_count}</Badge>
                            </div>
                            <Separator className="my-3" />
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>{tAdmin("journey.start", { value: formatDateTime(session.started_at, locale) })}</p>
                              <p>{tAdmin("journey.lastSeen", { value: formatDateTime(session.last_seen_at, locale) })}</p>
                              <p className="truncate">{tAdmin("journey.entry", { value: session.entry_link })}</p>
                              {session.landing_referrer ? <p className="truncate">{tAdmin("journey.referrer", { value: session.landing_referrer })}</p> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <Empty className="min-h-[320px]">
                      <EmptyMedia variant="icon">
                        <ActivityIcon className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle>{tAdmin("journey.noSessionsTitle")}</EmptyTitle>
                        <EmptyDescription>{tAdmin("journey.noSessionsDescription")}</EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent />
                    </Empty>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ActivityIcon className="h-4 w-4" />
                      {tAdmin("journey.summary")}
                    </CardTitle>
                    <CardDescription>
                      {selectedSession
                        ? tAdmin("journey.viewingSession", { id: selectedSession.id.slice(0, 8) })
                        : tAdmin("journey.viewingAllSessions")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tAdmin("journey.topPages")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(overview?.top_pages ?? []).slice(0, 6).map((row) => (
                          <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tAdmin("journey.topCtas")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(overview?.top_ctas ?? []).slice(0, 6).map((row) => (
                          <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tAdmin("journey.flows")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(overview?.recent_flows ?? []).slice(0, 6).map((row) => (
                          <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>{tAdmin("journey.selectedSessionSource", { value: selectedSession?.landing_source ?? tAdmin("common.all") })}</p>
                      <p>{tAdmin("journey.selectedSessionDevice", { value: selectedSession?.device_type ?? "—" })}</p>
                      <p>{tAdmin("journey.selectedSessionLocale", { value: selectedSession?.locale ?? "—" })}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="min-h-[520px]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ClockIcon className="h-4 w-4" />
                      {tAdmin("journey.eventTimeline")}
                    </CardTitle>
                    <CardDescription>
                      {tAdmin("journey.eventsInScope", { count: events?.total ?? 0 })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <JourneyEventTimeline
                      events={events?.data}
                      total={events?.total}
                      loading={isLoading && !events}
                      onViewRaw={setRawEvent}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </AdminTabsContent>
        </AdminTabs>
      </div>

      {/* Raw metadata dialog */}
      <Dialog open={!!rawEvent} onOpenChange={(open) => !open && setRawEvent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{tAdmin("journey.rawMetadata")}</DialogTitle>
            <DialogDescription>
              {tAdmin("journey.rawEventTitle", {
                event: rawEvent?.event_name,
                date: formatDateTime(rawEvent?.occurred_at, locale),
              })}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(rawEvent, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tAdmin("journey.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tAdmin("journey.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={deleteTimeRange} onValueChange={setDeleteTimeRange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={tAdmin("journey.deleteRangePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {DELETE_TIME_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {tAdmin(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tAdmin("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteTimeRange)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  {tAdmin("journey.deleting")}
                </>
              ) : (
                tAdmin("journey.confirmDelete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
