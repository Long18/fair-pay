import { XIcon, ExternalLink, CalendarClock, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  page_view: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  nav_click: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  cta_click: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  form_submit: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  form_success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  form_error: "bg-red-500/20 text-red-300 border-red-500/30",
  auth_login: "bg-green-500/20 text-green-300 border-green-500/30",
  auth_register: "bg-pink-500/20 text-pink-300 border-pink-500/30",
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
    <div className="absolute top-4 right-4 z-10 w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-right-2 overflow-hidden">
      {/* Top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: "linear-gradient(90deg, #b6a0ff 0%, #77a1ff 100%)" }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Page</p>
            <div className="flex items-start gap-1.5">
              <p className="text-white text-sm font-medium leading-snug break-all flex-1">
                {node.pagePath}
              </p>
              <button
                type="button"
                onClick={() => window.open(node.pagePath, "_blank", "noopener,noreferrer")}
                className="shrink-0 text-white/30 hover:text-white/70 transition-colors mt-0.5"
                title="Mở trang"
              >
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-white/50 hover:text-white/90 transition-colors"
            aria-label="Đóng"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1">Lượt xem</p>
            <p className="text-white text-lg font-semibold">
              {node.visitCount.toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1">Thời gian TB</p>
            <p className="text-white text-lg font-semibold">
              {formatDuration(node.avgDurationSeconds)}
            </p>
          </div>
        </div>

        {/* Event types */}
        {node.eventTypes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={12} className="text-white/40" />
              <p className="text-white/40 text-xs">Loại event ({node.eventTypes.length})</p>
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
          <CalendarClock size={12} className="text-white/40" />
          <p className="text-white/40 text-xs">Lần cuối</p>
        </div>
        <p className="text-white/80 text-sm mb-4">
          {formatLastVisited(node.lastVisitedAt)}
        </p>

        {/* Timeline hint */}
        <div className="border-t border-white/5 pt-3">
          <p className="text-white/30 text-[11px] leading-relaxed">
            Xem toàn bộ metadata và raw events tại tab{" "}
            <span className="text-violet-300/70 font-medium">Timeline</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
