import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface FloatingChatWindowProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

interface Rect { x: number; y: number; w: number; h: number }

const MIN_WIDTH = 360;
const MIN_HEIGHT = 480;
const DEFAULT_WIDTH = 460;
const DEFAULT_HEIGHT = 640;
const EDGE_MARGIN = 12;

function defaultRect(): Rect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const w = Math.min(DEFAULT_WIDTH, vw - EDGE_MARGIN * 2);
  const h = Math.min(DEFAULT_HEIGHT, vh - EDGE_MARGIN * 2);
  return {
    x: Math.max(EDGE_MARGIN, Math.round((vw - w) / 2)),
    y: Math.max(EDGE_MARGIN, Math.round((vh - h) / 2)),
    w,
    h,
  };
}

function clampRect(rect: Rect): Rect {
  if (typeof window === "undefined") return rect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(MIN_WIDTH, Math.min(rect.w, vw - EDGE_MARGIN * 2));
  const h = Math.max(MIN_HEIGHT, Math.min(rect.h, vh - EDGE_MARGIN * 2));
  const x = Math.max(EDGE_MARGIN, Math.min(rect.x, vw - w - EDGE_MARGIN));
  const y = Math.max(EDGE_MARGIN, Math.min(rect.y, vh - h - EDGE_MARGIN));
  return { x, y, w, h };
}

export const FloatingChatWindow = memo(function FloatingChatWindow({
  open,
  onClose,
  children,
}: FloatingChatWindowProps) {
  // Position resets to center on every page load — no localStorage persistence
  const [rect, setRect] = useState<Rect>(() => clampRect(defaultRect()));

  // Keep window inside the viewport when it changes size (e.g. user resizes browser)
  useEffect(() => {
    if (!open) return;
    const onResize = () => setRect((prev) => clampRect(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const dragStateRef = useRef<{ x: number; y: number; startRect: Rect; mode: "drag" | "resize" } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = dragStateRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    setRect(() => {
      const start = s.startRect;
      if (s.mode === "drag") return clampRect({ x: start.x + dx, y: start.y + dy, w: start.w, h: start.h });
      return clampRect({ x: start.x, y: start.y, w: start.w + dx, h: start.h + dy });
    });
  }, []);

  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragStateRef.current = { x: e.clientX, y: e.clientY, startRect: rect, mode: "drag" };
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
    },
    [rect, onPointerMove, endDrag],
  );

  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragStateRef.current = { x: e.clientX, y: e.clientY, startRect: rect, mode: "resize" };
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", endDrag);
    },
    [rect, onPointerMove, endDrag],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="FairPay Assistant"
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
      )}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {/* Drag strip — dedicated grab area with close button */}
      <div
        onPointerDown={startDrag}
        className="flex h-7 shrink-0 select-none items-center justify-between border-b bg-muted/40 pl-2 pr-1 cursor-grab active:cursor-grabbing"
      >
        <span aria-hidden className="inline-block h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Close chat"
          className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon size={13} />
        </button>
      </div>

      {/* Panel body — passed as children (fills remaining space) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      {/* Resize grip (bottom-right) */}
      <div
        onPointerDown={startResize}
        aria-label="Resize"
        role="separator"
        className="absolute bottom-0 right-0 z-10 h-4 w-4 cursor-nwse-resize"
      >
        <svg viewBox="0 0 16 16" className="h-full w-full text-muted-foreground/50">
          <path d="M2 14 L14 2 M6 14 L14 6 M10 14 L14 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
});

export default FloatingChatWindow;
