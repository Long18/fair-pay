import { ExternalLink, CalendarClock, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { journeyGradient } from "./journey-theme";
import { useAdminTranslation } from "../../i18n";

interface JourneyNodeDetailData {
  pagePath: string;
  visitCount: number;
  lastVisitedAt: string;
  eventTypes: string[];
  avgDurationSeconds: number | null;
}

interface JourneyNodeDetailPanelProps {
  node: JourneyNodeDetailData | null;
  onClose: () => void;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: "border-primary/25 bg-primary/10 text-primary",
  nav_click: "border-chart-2/25 bg-chart-2/10 text-chart-2",
  cta_click: "border-accent/25 bg-accent/10 text-accent",
  form_submit: "border-status-info-border bg-status-info-bg text-status-info",
  form_success: "border-status-success-border bg-status-success-bg text-semantic-positive",
  form_error: "border-status-error-border bg-status-error-bg text-semantic-negative",
  auth_login: "border-status-success-border bg-status-success-bg text-semantic-positive",
  auth_register: "border-chart-5/25 bg-chart-5/10 text-chart-5",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "N/A";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

const lastVisitedFormatterCache = new Map<string, Intl.DateTimeFormat>();
function getLastVisitedFormatter(locale: string): Intl.DateTimeFormat {
  let formatter = lastVisitedFormatterCache.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    });
    lastVisitedFormatterCache.set(locale, formatter);
  }
  return formatter;
}

function formatLastVisited(dateStr: string, locale: string): string {
  try {
    return getLastVisitedFormatter(locale).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function JourneyNodeDetailPanel({ node, onClose }: JourneyNodeDetailPanelProps) {
  const { tAdmin, locale } = useAdminTranslation();

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
        {node ? (
          <>
            <div className="h-0.5 w-full" style={{ background: journeyGradient }} />
            <SheetHeader className="pt-4">
              <SheetTitle className="text-left text-sm">{tAdmin("journey.canvas.page")}</SheetTitle>
              <SheetDescription className="text-left">
                <span className="flex items-start gap-1.5">
                  <span className="flex-1 break-all font-mono text-xs text-foreground">{node.pagePath}</span>
                  <button
                    type="button"
                    onClick={() => window.open(node.pagePath, "_blank", "noopener,noreferrer")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title={tAdmin("journey.canvas.openPage")}
                  >
                    <ExternalLink size={13} />
                  </button>
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/80 p-3">
                <p className="mb-1 text-xs text-muted-foreground">{tAdmin("journey.canvas.views")}</p>
                <p className="text-lg font-semibold tabular-nums">{node.visitCount.toLocaleString(locale)}</p>
              </div>
              <div className="rounded-lg bg-muted/80 p-3">
                <p className="mb-1 text-xs text-muted-foreground">{tAdmin("journey.canvas.avgTime")}</p>
                <p className="text-lg font-semibold">{formatDuration(node.avgDurationSeconds)}</p>
              </div>
            </div>

            {node.eventTypes.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5">
                  <BarChart2 size={12} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {tAdmin("journey.canvas.eventTypes", { count: node.eventTypes.length })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {node.eventTypes.map((type) => {
                    const colorClass =
                      EVENT_TYPE_COLORS[type] ?? "border-border bg-muted text-muted-foreground";
                    return (
                      <Badge key={type} variant="outline" className={`text-xs font-normal ${colorClass}`}>
                        {type}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock size={12} />
              {tAdmin("journey.canvas.lastSeen")}
            </div>
            <p className="mt-1 text-sm">{formatLastVisited(node.lastVisitedAt, locale)}</p>

            <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
              {tAdmin("journey.canvas.timelineHint")}
            </p>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated Use JourneyNodeDetailPanel */
export const JourneyNodeDetail = JourneyNodeDetailPanel;
