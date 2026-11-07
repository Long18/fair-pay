import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type DashboardMetricItem = {
  key: string;
  label: string;
  value: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: string;
  anchor?: boolean;
};

export type DashboardMetricExpandRow = {
  key: string;
  label: string;
  value: string;
  tone?: string;
};

interface DashboardMetricsIslandProps {
  items: readonly DashboardMetricItem[];
  isLoading?: boolean;
  className?: string;
  variant?: "pill" | "notch";
  expandable?: boolean;
  expandRows?: readonly DashboardMetricExpandRow[];
  expandAriaLabel?: string;
  "aria-busy"?: boolean;
}

const EXPAND_FRAME_SPRING = {
  type: "spring" as const,
  duration: 0.42,
  bounce: 0.15,
};

const COLLAPSE_FRAME_EASE = {
  duration: 0.3,
  ease: [0.32, 0.72, 0, 1] as const,
};

const CONTENT_SHOW = { delay: 0.08, duration: 0.22, ease: "easeOut" as const };
const CONTENT_HIDE = { duration: 0.12, ease: "easeIn" as const };

const PEEK_SCALE = 1.028;
const HOVER_PEEK_DELAY_MS = 150;

function useHoverCapable() {
  const [hoverCapable, setHoverCapable] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover)");
    const sync = () => setHoverCapable(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return hoverCapable;
}

function pickNotchWings(items: readonly DashboardMetricItem[]) {
  const left = items.find((item) => item.key === "owe") ?? items[0];
  const owed = items.find((item) => item.key === "owed");
  const net =
    items.find((item) => item.anchor) ??
    items.find((item) => item.key === "net") ??
    items[items.length - 1];
  const netNeutral = net?.tone.includes("muted-foreground");
  const right = netNeutral && owed ? owed : net;
  return { left, right };
}

function NotchWing({
  item,
  isLoading,
  showLabel,
  side,
}: {
  item: DashboardMetricItem;
  isLoading?: boolean;
  showLabel: boolean;
  side: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-[5.5rem] items-center gap-1 py-2 sm:max-w-[6.25rem] sm:gap-1.5",
        side === "left" ? "pl-2.5 pr-1 sm:pl-3" : "pl-1 pr-2.5 sm:pr-3",
      )}
    >
      <item.icon className={cn("size-3.5 shrink-0", item.tone)} aria-hidden />
      <div className="min-w-0 flex-1">
        {showLabel ? (
          <p className="truncate text-[9px] font-medium text-muted-foreground dark:text-zinc-400 sm:text-[10px]">
            {item.label}
          </p>
        ) : null}
        <p
          className={cn(
            "truncate text-[11px] font-semibold tabular-nums sm:text-xs",
            item.tone,
            isLoading && "text-muted-foreground",
          )}
        >
          {isLoading ? "…" : item.value}
        </p>
      </div>
    </div>
  );
}

export function DashboardMetricsIsland({
  items,
  isLoading,
  className,
  variant = "pill",
  expandable = false,
  expandRows,
  expandAriaLabel,
  "aria-busy": ariaBusy,
}: DashboardMetricsIslandProps) {
  const reducedMotion = useReducedMotion();
  const hoverCapable = useHoverCapable();
  const rootRef = useRef<HTMLDivElement>(null);

  const [pointerOver, setPointerOver] = useState(false);
  const [hoverPeekReady, setHoverPeekReady] = useState(false);
  const [clickedExpanded, setClickedExpanded] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const contentShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverPeekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canExpand = expandable && (expandRows?.length ?? 0) > 0;
  const isNotch = variant === "notch";
  const isExpanded = canExpand && clickedExpanded;
  const showPeek =
    isNotch &&
    hoverPeekReady &&
    pointerOver &&
    hoverCapable &&
    !reducedMotion &&
    canExpand &&
    !clickedExpanded;

  const clearHoverPeekTimer = useCallback(() => {
    if (hoverPeekTimerRef.current) {
      clearTimeout(hoverPeekTimerRef.current);
      hoverPeekTimerRef.current = null;
    }
  }, []);

  const handlePointerEnter = useCallback(() => {
    setPointerOver(true);
    clearHoverPeekTimer();
    setHoverPeekReady(false);
    if (!canExpand || !hoverCapable || reducedMotion || clickedExpanded) return;
    hoverPeekTimerRef.current = setTimeout(() => {
      hoverPeekTimerRef.current = null;
      setHoverPeekReady(true);
    }, HOVER_PEEK_DELAY_MS);
  }, [canExpand, clickedExpanded, clearHoverPeekTimer, hoverCapable, reducedMotion]);

  const handlePointerLeave = useCallback(() => {
    setPointerOver(false);
    clearHoverPeekTimer();
    setHoverPeekReady(false);
  }, [clearHoverPeekTimer]);

  const clearContentShowTimer = useCallback(() => {
    if (contentShowTimerRef.current) {
      clearTimeout(contentShowTimerRef.current);
      contentShowTimerRef.current = null;
    }
  }, []);

  const openExpanded = useCallback(() => {
    clearHoverPeekTimer();
    setHoverPeekReady(false);
    setClickedExpanded(true);
    clearContentShowTimer();
    if (reducedMotion) {
      setContentVisible(true);
      return;
    }
    contentShowTimerRef.current = setTimeout(() => {
      contentShowTimerRef.current = null;
      setContentVisible(true);
    }, CONTENT_SHOW.delay * 1000);
  }, [clearContentShowTimer, clearHoverPeekTimer, reducedMotion]);

  const closeExpanded = useCallback(() => {
    clearContentShowTimer();
    setContentVisible(false);
    setClickedExpanded(false);
  }, [clearContentShowTimer]);

  const toggleExpanded = useCallback(() => {
    if (!canExpand) return;
    if (clickedExpanded) {
      closeExpanded();
    } else {
      openExpanded();
    }
  }, [canExpand, clickedExpanded, closeExpanded, openExpanded]);

  useEffect(
    () => () => {
      clearContentShowTimer();
      clearHoverPeekTimer();
    },
    [clearContentShowTimer, clearHoverPeekTimer],
  );

  useEffect(() => {
    if (!clickedExpanded) return;
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        closeExpanded();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [clickedExpanded, closeExpanded]);

  const frameTransition = reducedMotion
    ? { duration: 0 }
    : isExpanded
      ? EXPAND_FRAME_SPRING
      : COLLAPSE_FRAME_EASE;

  const notchRadius = isExpanded
    ? { tl: 28, tr: 28, bl: 32, br: 32 }
    : { tl: 22, tr: 22, bl: 22, br: 22 };

  const restScale = isLoading
    ? 1.04
    : showPeek
      ? PEEK_SCALE
      : 1;

  const { left: leftWing, right: rightWing } = pickNotchWings(items);
  const showWingLabels = showPeek || isExpanded;

  if (isNotch) {
    return (
      <div className={cn("relative z-[1] flex justify-center", className)}>
        <div
          ref={rootRef}
          className="p-2 -m-2"
          onMouseEnter={handlePointerEnter}
          onMouseLeave={handlePointerLeave}
        >
          <motion.div
            role={canExpand ? "button" : undefined}
            tabIndex={canExpand ? 0 : undefined}
            aria-expanded={canExpand ? isExpanded : undefined}
            aria-label={canExpand ? expandAriaLabel : undefined}
            aria-busy={ariaBusy}
            onClick={canExpand ? toggleExpanded : undefined}
            onKeyDown={(event) => {
              if (!canExpand) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleExpanded();
              } else if (event.key === "Escape" && clickedExpanded) {
                event.preventDefault();
                closeExpanded();
              }
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    scale: restScale,
                    maxWidth: isExpanded ? "28rem" : "14rem",
                    borderTopLeftRadius: notchRadius.tl,
                    borderTopRightRadius: notchRadius.tr,
                    borderBottomLeftRadius: notchRadius.bl,
                    borderBottomRightRadius: notchRadius.br,
                  }
            }
            transition={{
              scale: { duration: 0.2, ease: "easeOut" },
              ...(frameTransition as object),
            }}
            className={cn(
              "w-auto max-w-[min(100%,14rem)] overflow-hidden rounded-[22px] outline-none",
              "border border-border/50 bg-card text-foreground shadow-lg",
              "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100",
              canExpand && "cursor-pointer",
              isExpanded && "max-w-md",
            )}
          >
            <div
              className={cn(
                "flex items-stretch justify-center",
                isExpanded ? "min-w-[18rem]" : "min-w-[min(100%,12rem)]",
              )}
            >
              <NotchWing
                item={leftWing}
                isLoading={isLoading}
                showLabel={showWingLabels}
                side="left"
              />
              <div
                aria-hidden
                className="mx-0.5 flex w-5 shrink-0 items-center justify-center self-stretch sm:mx-1 sm:w-6"
              >
                <span className="size-1.5 rounded-full bg-muted-foreground/35 dark:bg-zinc-500/50" />
              </div>
              <NotchWing
                item={rightWing}
                isLoading={isLoading}
                showLabel={showWingLabels}
                side="right"
              />
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && expandRows ? (
                <motion.div
                  key="expand-panel"
                  initial={reducedMotion ? false : { height: 0 }}
                  animate={{
                    height: "auto",
                    transition: frameTransition,
                  }}
                  exit={{
                    height: 0,
                    transition: {
                      ...COLLAPSE_FRAME_EASE,
                      delay: CONTENT_HIDE.duration,
                    },
                  }}
                  className="overflow-hidden border-t border-border/40 dark:border-zinc-800"
                >
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0 }}
                    animate={{
                      opacity: contentVisible ? 1 : 0,
                      transition: contentVisible ? CONTENT_SHOW : CONTENT_HIDE,
                    }}
                    className="space-y-1.5 px-5 py-2.5 sm:py-3"
                  >
                    {expandRows.map((row) => (
                      <div
                        key={row.key}
                        className="flex items-baseline justify-between gap-3 text-[11px] sm:text-xs"
                      >
                        <span className="shrink-0 text-muted-foreground dark:text-zinc-400">
                          {row.label}
                        </span>
                        <span
                          className={cn(
                            "min-w-0 truncate text-right font-medium tabular-nums",
                            row.tone ?? "text-foreground dark:text-zinc-100",
                          )}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-xl items-stretch",
          "rounded-full border border-border/60 bg-card/90 shadow-none",
          "ring-1 ring-border/30",
        )}
        aria-busy={ariaBusy}
      >
        {items.map((item, index) => (
          <div key={item.key} className="flex min-w-0 flex-1 items-center">
            {index > 0 ? (
              <div
                aria-hidden
                className="my-2.5 w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-border/55 to-transparent sm:my-3"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5">
              <item.icon
                className={cn("hidden size-3.5 shrink-0 sm:block", item.tone)}
                aria-hidden
              />
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                  {item.label}
                </p>
                <p
                  className={cn(
                    "truncate text-[11px] font-semibold tabular-nums sm:text-sm",
                    item.tone,
                    isLoading && "text-muted-foreground",
                  )}
                >
                  {isLoading ? "…" : item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
