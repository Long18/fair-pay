import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
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
import { Loader2Icon } from "@/components/ui/icons";
import { JourneyWorkspace } from "../components/journey-canvas/JourneyWorkspace";
import { JourneyCompactToolbar } from "../components/journey-canvas/JourneyCompactToolbar";
import { JourneyOverviewSheet } from "../components/journey-canvas/JourneyOverviewSheet";
import { useAdminTranslation } from "../i18n";
import type {
  AdminUserRow,
  DeleteTrackingResponse,
  PaginatedAdminResponse,
  UserTrackingEventRow,
  UserTrackingOverview,
  UserTrackingSessionRow,
} from "../types";

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

export function AdminUserJourney() {
  const { tAdmin, locale } = useAdminTranslation();
  const { id: userId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
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
  const [overviewOpen, setOverviewOpen] = useState(false);

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

  const selectedSession = useMemo(
    () => sessions?.data.find((session) => session.id === resolvedSessionId) ?? null,
    [resolvedSessionId, sessions?.data],
  );

  const formatDt = (value: string | null | undefined) => formatDateTime(value, locale);

  if (isUserLoading && !user) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        {tAdmin("journey.loadingUser")}
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-col gap-3">
        <JourneyCompactToolbar
          userName={user?.full_name ?? tAdmin("common.user")}
          userEmail={user?.email}
          userAvatarUrl={user?.avatar_url}
          userIgnored={user?.journey_tracking_ignored}
          dateFrom={dateFrom}
          dateTo={dateTo}
          eventFilter={eventFilter}
          overview={overview}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onEventFilterChange={setEventFilter}
          onDeleteClick={() => setDeleteDialogOpen(true)}
          onOverviewClick={() => setOverviewOpen(true)}
        />

        <JourneyWorkspace
          userId={userId}
          subjectUser={
            user
              ? {
                  fullName: user.full_name ?? tAdmin("common.user"),
                  email: user.email,
                  avatarUrl: user.avatar_url,
                }
              : null
          }
          sessionId={resolvedSessionId}
          fromIso={fromIso}
          toIso={toIso}
          eventNames={selectedEventNames}
          sourceName={searchParams.get("source") || selectedSession?.landing_source || overview?.top_sources?.[0]?.name || null}
          entryLink={selectedSession?.entry_link ?? overview?.latest_entry_link ?? null}
          sessions={sessions?.data}
          sessionsTotal={sessions?.total ?? 0}
          sessionsLoading={isSessionsLoading || isOverviewLoading}
          events={events?.data}
          eventsLoading={isEventsLoading}
          selectedSessionId={resolvedSessionId}
          onSelectSession={setSelectedSessionId}
          onViewRaw={setRawEvent}
        />
      </div>

      <JourneyOverviewSheet
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
        overview={overview}
        selectedSession={selectedSession}
        formatDateTime={formatDt}
      />

      <Dialog open={!!rawEvent} onOpenChange={(open) => !open && setRawEvent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{tAdmin("journey.rawMetadata")}</DialogTitle>
            <DialogDescription>
              {tAdmin("journey.rawEventTitle", {
                event: rawEvent?.event_name,
                date: formatDt(rawEvent?.occurred_at),
              })}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(rawEvent, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

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
