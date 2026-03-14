import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
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
  ExternalLinkIcon,
  FileTextIcon,
  Loader2Icon,
  UserIcon,
} from "@/components/ui/icons";
import type {
  AdminUserRow,
  PaginatedAdminResponse,
  UserTrackingEventRow,
  UserTrackingOverview,
  UserTrackingSessionRow,
} from "../types";

const EVENT_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả event" },
  { value: "page_view", label: "Page view" },
  { value: "nav_click", label: "Navigation click" },
  { value: "cta_click", label: "CTA click" },
  { value: "form_step_view", label: "Form step view" },
  { value: "form_submit", label: "Form submit" },
  { value: "form_success", label: "Form success" },
  { value: "form_error", label: "Form error" },
  { value: "auth_login", label: "Auth login" },
  { value: "auth_register", label: "Auth register" },
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAggregateLabel(rows: Array<{ name: string; count: number }>) {
  if (rows.length === 0) return "—";
  return rows.map((row) => `${row.name} (${row.count})`).join(", ");
}

function EventBadge({ eventName }: { eventName: string }) {
  const styles: Record<string, string> = {
    page_view: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
    nav_click: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900",
    cta_click: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    form_submit: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-900",
    form_success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
    form_error: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    auth_login: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
    auth_register: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-900",
  };

  return (
    <Badge className={styles[eventName] ?? "bg-muted text-foreground border-border"}>
      {eventName}
    </Badge>
  );
}

export function AdminUserJourney() {
  const { id: userId } = useParams<{ id: string }>();
  const [dateFrom, setDateFrom] = useState(() => {
    const value = new Date();
    value.setDate(value.getDate() - 14);
    return toDateInput(value);
  });
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [rawEvent, setRawEvent] = useState<UserTrackingEventRow | null>(null);

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

  const { data: events, isLoading: isEventsLoading } = useQuery({
    queryKey: ["admin", "tracking-events", userId, selectedSessionId, fromIso, toIso, eventFilter],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_user_tracking_events", {
        p_user_id: userId,
        p_session_id: selectedSessionId !== "all" ? selectedSessionId : null,
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

  useEffect(() => {
    if (!sessions?.data?.length) {
      setSelectedSessionId("all");
      return;
    }

    if (selectedSessionId !== "all" && !sessions.data.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId("all");
    }
  }, [selectedSessionId, sessions?.data]);

  const isLoading = isUserLoading || isOverviewLoading || isSessionsLoading || isEventsLoading;

  const selectedSession = useMemo(
    () => sessions?.data.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions?.data],
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:text-foreground">
              <Link to="/admin/people">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Quay lại People
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Journey của {user?.full_name ?? "người dùng"}
                  </h1>
                  {user?.journey_tracking_ignored ? (
                    <Badge variant="outline">Tracking ignored</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {user?.email ?? "Đang tải thông tin người dùng..."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-[160px]" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-[160px]" />
            <Select value={eventFilter} onValueChange={setEventFilter}>
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Lọc event" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng session</CardDescription>
              <CardTitle className="text-3xl">{overview?.total_sessions ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              First seen: {formatDateTime(overview?.first_seen_at)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tổng event</CardDescription>
              <CardTitle className="text-3xl">{overview?.total_events ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Unique pages: {overview?.unique_pages ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Nguồn vào gần nhất</CardDescription>
              <CardTitle className="text-xl">{overview?.top_sources?.[0]?.name ?? "direct"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Last seen: {formatDateTime(overview?.last_seen_at)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Entry link gần nhất</CardDescription>
              <CardTitle className="text-base break-all">{overview?.latest_entry_link ?? "—"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sources: {formatAggregateLabel(overview?.top_sources ?? [])}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[360px,1fr]">
          <Card className="min-h-[480px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ActivityIcon className="h-4 w-4" />
                Sessions
              </CardTitle>
              <CardDescription>
                Chọn session để xem timeline chi tiết.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && !sessions ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải session...
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
                      Tất cả sessions ({sessions.total})
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
                          <p>Start: {formatDateTime(session.started_at)}</p>
                          <p>Last seen: {formatDateTime(session.last_seen_at)}</p>
                          <p className="truncate">Entry: {session.entry_link}</p>
                          {session.landing_referrer ? <p className="truncate">Referrer: {session.landing_referrer}</p> : null}
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
                    <EmptyTitle>Chưa có session</EmptyTitle>
                    <EmptyDescription>Không tìm thấy dữ liệu journey trong khoảng thời gian đã chọn.</EmptyDescription>
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
                  Summary
                </CardTitle>
                <CardDescription>
                  {selectedSession ? `Đang xem session ${selectedSession.id.slice(0, 8)}` : "Đang xem toàn bộ sessions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top pages</p>
                  <div className="flex flex-wrap gap-2">
                    {(overview?.top_pages ?? []).slice(0, 6).map((row) => (
                      <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top CTAs</p>
                  <div className="flex flex-wrap gap-2">
                    {(overview?.top_ctas ?? []).slice(0, 6).map((row) => (
                      <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flows</p>
                  <div className="flex flex-wrap gap-2">
                    {(overview?.recent_flows ?? []).slice(0, 6).map((row) => (
                      <Badge key={row.name} variant="secondary">{row.name} ({row.count})</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Selected session source: {selectedSession?.landing_source ?? "all"}</p>
                  <p>Selected session device: {selectedSession?.device_type ?? "—"}</p>
                  <p>Selected session locale: {selectedSession?.locale ?? "—"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClockIcon className="h-4 w-4" />
                  Event Timeline
                </CardTitle>
                <CardDescription>
                  {events?.total ?? 0} event trong phạm vi đang lọc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && !events ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải event...
                  </div>
                ) : events?.data?.length ? (
                  <ScrollArea className="h-[560px] pr-3">
                    <div className="space-y-3">
                      {events.data.map((event) => {
                        const entityPath = typeof event.properties?.entity_path === "string"
                          ? event.properties.entity_path
                          : null;

                        return (
                          <div key={event.id} className="rounded-lg border p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-2 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <EventBadge eventName={event.event_name} />
                                  {event.target_key ? <Badge variant="outline">{event.target_key}</Badge> : null}
                                  {event.flow_name ? <Badge variant="secondary">{event.flow_name}</Badge> : null}
                                  {event.step_name ? <Badge variant="secondary">{event.step_name}</Badge> : null}
                                </div>
                                <p className="truncate text-sm font-medium">{event.page_path}</p>
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                  <span>Session: {event.session_id.slice(0, 8)}</span>
                                  <span>Occurred: {formatDateTime(event.occurred_at)}</span>
                                  {event.referrer_path ? <span>Referrer: {event.referrer_path}</span> : null}
                                  {event.target_type ? <span>Type: {event.target_type}</span> : null}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {entityPath ? (
                                  <Button asChild size="sm" variant="outline">
                                    <Link to={entityPath}>
                                      <ExternalLinkIcon className="mr-2 h-4 w-4" />
                                      Open entity
                                    </Link>
                                  </Button>
                                ) : null}
                                <Button size="sm" variant="outline" onClick={() => setRawEvent(event)}>
                                  <FileTextIcon className="mr-2 h-4 w-4" />
                                  Raw metadata
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <Empty className="min-h-[320px]">
                    <EmptyMedia variant="icon">
                      <ActivityIcon className="h-6 w-6" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>Không có event nào</EmptyTitle>
                      <EmptyDescription>Thử đổi date range, event filter hoặc chọn session khác.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent />
                  </Empty>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!rawEvent} onOpenChange={(open) => !open && setRawEvent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Raw metadata</DialogTitle>
            <DialogDescription>
              {rawEvent?.event_name} tại {formatDateTime(rawEvent?.occurred_at)}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(rawEvent, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
