import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminTranslation } from "../../i18n";
import type { UserTrackingOverview, UserTrackingSessionRow } from "../../types";

interface JourneyOverviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overview: UserTrackingOverview | undefined;
  selectedSession: UserTrackingSessionRow | null;
  formatDateTime: (value: string | null | undefined) => string;
}

export function JourneyOverviewSheet({
  open,
  onOpenChange,
  overview,
  selectedSession,
  formatDateTime,
}: JourneyOverviewSheetProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{tAdmin("journey.overview.title")}</SheetTitle>
          <SheetDescription>{tAdmin("journey.overview.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{tAdmin("journey.totalSessions")}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{overview?.total_sessions ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{tAdmin("journey.totalEvents")}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{overview?.total_events ?? 0}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{tAdmin("journey.latestSource")}</p>
              <p className="mt-1 font-medium">{overview?.top_sources?.[0]?.name ?? "direct"}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tAdmin("journey.topPages")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(overview?.top_pages ?? []).slice(0, 8).map((row) => (
                <Badge key={row.name} variant="secondary">
                  {row.name} ({row.count})
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tAdmin("journey.topCtas")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(overview?.top_ctas ?? []).slice(0, 8).map((row) => (
                <Badge key={row.name} variant="secondary">
                  {row.name} ({row.count})
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tAdmin("journey.flows")}
            </p>
            <div className="flex flex-wrap gap-2">
              {(overview?.recent_flows ?? []).slice(0, 8).map((row) => (
                <Badge key={row.name} variant="secondary">
                  {row.name} ({row.count})
                </Badge>
              ))}
            </div>
          </div>

          {selectedSession ? (
            <div className="space-y-1 border-t border-border pt-4 text-sm text-muted-foreground">
              <p>{tAdmin("journey.viewingSession", { id: selectedSession.id.slice(0, 8) })}</p>
              <p>{tAdmin("journey.start", { value: formatDateTime(selectedSession.started_at) })}</p>
              <p>{tAdmin("journey.selectedSessionDevice", { value: selectedSession.device_type ?? "—" })}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{tAdmin("journey.viewingAllSessions")}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
