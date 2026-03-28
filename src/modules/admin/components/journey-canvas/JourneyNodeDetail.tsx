import { XIcon, ExternalLink, CalendarClock, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { journeyGradient } from "./journey-theme";

interface JourneyNodeDetailData {
  pagePath: string;
  visitCount: number;
  lastVisitedAt: string;
  eventTypes: string[];
  avgDurationSeconds: number | null;
}

interface JourneyNodeDetailProps {
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

function formatLastVisited(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function JourneyNodeDetail({ node, onClose }: JourneyNodeDetailProps) {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 z-10 w-80 overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-2">
      {/* Top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: journeyGradient }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Page</p>
            <div className="flex items-start gap-1.5">
              <p className="flex-1 break-all text-sm font-medium leading-snug text-foreground">
                {node.pagePath}
              </p>
              <button
                type="button"
                onClick={() => window.open(node.pagePath, "_blank", "noopener,noreferrer")}
                className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                title="Mở trang"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Đóng"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-muted/80 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Lượt xem</p>
            <p className="text-lg font-semibold text-foreground">
              {node.visitCount.toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="rounded-lg bg-muted/80 p-3">
            <p className="mb-1 text-xs text-muted-foreground">Thời gian TB</p>
            <p className="text-lg font-semibold text-foreground">
              {formatDuration(node.avgDurationSeconds)}
            </p>
          </div>
        </div>

        {/* Event types */}
        {node.eventTypes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={12} className="text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Loại event ({node.eventTypes.length})</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {node.eventTypes.map((type) => {
                const colorClass =
                  EVENT_TYPE_COLORS[type] ??
                  "bg-white/10 text-white/60 border-white/20";
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className={`text-xs border px-2 py-0.5 rounded-md font-normal ${colorClass}`}
                  >
                    {type}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Last visited */}
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarClock size={12} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Lần cuối</p>
        </div>
        <p className="mb-4 text-sm text-foreground">
          {formatLastVisited(node.lastVisitedAt)}
        </p>

        {/* Timeline hint */}
        <div className="border-t border-border/70 pt-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Xem toàn bộ metadata và raw events tại tab{" "}
            <span className="font-medium text-primary">Timeline</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
