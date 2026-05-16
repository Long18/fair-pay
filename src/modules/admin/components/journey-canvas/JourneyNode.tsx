import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Eye,
  MousePointerClick,
  FileText,
  KeyRound,
  Share2,
  Receipt,
  CreditCard,
  Users,
  Clock,
  History,
  ExternalLink,
  FileStack,
} from "lucide-react";
import { journeyGradient, journeyMutedGradient, journeyPalette } from "./journey-theme";
import { useAdminTranslation } from "../../i18n";

export type JourneyNodeData = {
  pagePath: string;
  visitCount: number;
  lastVisitedAt: string;
  eventTypes: string[];
  avgDurationSeconds: number | null;
  isLastSeen: boolean;
};

export type JourneyNodeType = Node<JourneyNodeData, "journeyNode">;

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

type EventCategory = "view" | "click" | "form" | "auth" | "share" | "expense" | "payment" | "group" | "default";

function getEventCategory(eventType: string): EventCategory {
  const lower = eventType.toLowerCase();
  if (lower.includes("page_view") || lower === "view") return "view";
  if (lower.includes("click") || lower.includes("tap")) return "click";
  if (lower.includes("form")) return "form";
  if (lower.includes("auth") || lower.includes("login") || lower.includes("register")) return "auth";
  if (lower.includes("share")) return "share";
  if (lower.includes("expense")) return "expense";
  if (lower.includes("payment")) return "payment";
  if (lower.includes("group") || lower.includes("member")) return "group";
  return "default";
}

const CATEGORY_STYLES: Record<EventCategory, { chip: string; icon: React.ReactNode }> = {
  view:    { chip: "border-primary/25 bg-primary/8 text-primary",                             icon: <Eye size={10} /> },
  click:   { chip: "border-status-info-border bg-status-info-bg text-status-info",            icon: <MousePointerClick size={10} /> },
  form:    { chip: "border-status-success-border bg-status-success-bg text-semantic-positive", icon: <FileText size={10} /> },
  auth:    { chip: "border-status-warning-border bg-status-warning-bg text-status-warning",   icon: <KeyRound size={10} /> },
  share:   { chip: "border-chart-5/25 bg-chart-5/8 text-chart-5",                             icon: <Share2 size={10} /> },
  expense: { chip: "border-chart-2/25 bg-chart-2/8 text-chart-2",                             icon: <Receipt size={10} /> },
  payment: { chip: "border-accent/25 bg-accent/8 text-accent",                                icon: <CreditCard size={10} /> },
  group:   { chip: "border-chart-3/25 bg-chart-3/8 text-chart-3",                             icon: <Users size={10} /> },
  default: { chip: "border-border/60 bg-muted/60 text-muted-foreground",                      icon: <Eye size={10} /> },
};

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "var(--card)",
  border: "1.5px solid color-mix(in oklch, var(--border) 80%, transparent)",
  borderRadius: "50%",
  boxShadow: "0 0 0 2px color-mix(in oklch, var(--background) 90%, transparent)",
};

const highlightHandleStyle: React.CSSProperties = {
  ...handleStyle,
  border: "1.5px solid color-mix(in oklch, var(--primary) 60%, transparent)",
  boxShadow: "0 0 0 2px color-mix(in oklch, var(--background) 90%, transparent), 0 0 6px color-mix(in oklch, var(--primary) 30%, transparent)",
};

export const JourneyNode = memo(function JourneyNode({ data }: NodeProps<JourneyNodeType>) {
  const { tAdmin } = useAdminTranslation();
  const { pagePath, visitCount, lastVisitedAt, eventTypes, avgDurationSeconds, isLastSeen } = data;

  const relativeTime = (() => {
    try {
      const diff = Date.now() - new Date(lastVisitedAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return tAdmin("journey.canvas.justNow");
      if (mins < 60) return tAdmin("journey.canvas.minsAgo", { count: mins });
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return tAdmin("journey.canvas.hoursAgo", { count: hrs });
      return tAdmin("journey.canvas.daysAgo", { count: Math.floor(hrs / 24) });
    } catch {
      return lastVisitedAt;
    }
  })();

  const visibleEvents = eventTypes.slice(0, 5);
  const overflowCount = eventTypes.length - visibleEvents.length;

  return (
    <>
      <Handle type="target" position={Position.Top} style={isLastSeen ? highlightHandleStyle : handleStyle} />

      <div
        className={[
          "overflow-hidden rounded-xl border bg-card shadow-lg backdrop-blur-xl select-none",
          "min-w-[248px] max-w-[296px]",
          isLastSeen ? "journey-node-glow border-primary/35" : "border-border/65",
        ].filter(Boolean).join(" ")}
        style={{
          boxShadow: isLastSeen ? journeyPalette.highlightShadow : journeyPalette.softShadow,
        }}
      >
        <div
          className="h-[1.5px] w-full"
          style={{ background: isLastSeen ? journeyGradient : journeyMutedGradient }}
        />

        <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
          <div className="flex items-center gap-1.5">
            <FileStack size={11} className="text-muted-foreground/70" />
            <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/70">
              {tAdmin("journey.canvas.pageType")}
            </span>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border/50 bg-muted/60 px-2 py-0.5">
            <Eye size={9} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold tabular-nums text-foreground">{visitCount}</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 px-3.5 pb-3">
          <p
            className="flex-1 break-all font-mono text-[11px] font-medium leading-snug text-foreground"
            title={pagePath}
          >
            {pagePath}
          </p>
          <button
            type="button"
            title={tAdmin("journey.canvas.openPage")}
            onClick={(e) => {
              e.stopPropagation();
              window.open(pagePath, "_blank", "noopener,noreferrer");
            }}
            className="mt-0.5 shrink-0 cursor-pointer text-muted-foreground/60 transition-colors duration-150 hover:text-foreground"
          >
            <ExternalLink size={11} />
          </button>
        </div>

        <div className="flex items-center gap-0 border-t border-border/50">
          <div className="flex flex-1 items-center gap-1.5 px-3.5 py-2.5">
            <Clock size={11} className="shrink-0 text-muted-foreground/60" />
            <span className="font-mono text-[11px] font-medium text-foreground">{formatDuration(avgDurationSeconds)}</span>
          </div>
          <div className="h-4 w-px bg-border/50" />
          <div className="flex flex-1 items-center justify-end gap-1.5 px-3.5 py-2.5">
            <History size={11} className="shrink-0 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground">{relativeTime}</span>
          </div>
        </div>

        {visibleEvents.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-3.5 py-2.5">
            {visibleEvents.map((et, i) => {
              const cat = getEventCategory(et);
              const { chip, icon } = CATEGORY_STYLES[cat];
              return (
                <span
                  key={i}
                  title={et}
                  className={`flex items-center gap-1 rounded-md border px-1.5 py-[3px] ${chip}`}
                >
                  {icon}
                  <span className="text-[9px] font-medium leading-none">
                    {et.length > 14 ? et.slice(0, 14) + "…" : et}
                  </span>
                </span>
              );
            })}
            {overflowCount > 0 && (
              <span className="rounded-md border border-border/50 bg-muted/60 px-1.5 py-[3px] text-[9px] text-muted-foreground">
                +{overflowCount}
              </span>
            )}
          </div>
        )}

        {isLastSeen && (
          <div className="flex items-center gap-1.5 border-t border-primary/15 bg-primary/5 px-3.5 py-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="text-[10px] font-semibold text-primary">
              {tAdmin("journey.canvas.lastSeenBadge")}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={isLastSeen ? highlightHandleStyle : handleStyle} />
    </>
  );
});
