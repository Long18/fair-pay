import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { PondFeedControl } from "./DashboardPond";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/use-track-event";
import { PondSoundToggle } from "./PondSoundToggle";
import { POND_SOUND_EVENT, pondSound } from "./sound";

const PondViewport = lazy(() =>
  import("./DashboardPond").then((m) => ({ default: m.PondViewport })),
);

type SimProps = { className?: string };

const SIMS: Record<Exclude<SimModeId, "pond">, ComponentType<SimProps>> = {
  sheep: lazy(() => import("./sim-modes/SheepSim").then((m) => ({ default: m.SheepSim }))),
  beach: lazy(() => import("./sim-modes/BeachSim").then((m) => ({ default: m.BeachSim }))),
  rocks: lazy(() => import("./sim-modes/RockSkipSim").then((m) => ({ default: m.RockSkipSim }))),
  magnify: lazy(() => import("./sim-modes/MagnifySim").then((m) => ({ default: m.MagnifySim }))),
  ocean: lazy(() => import("./sim-modes/OceanSim").then((m) => ({ default: m.OceanSim }))),
  soccer: lazy(() => import("./sim-modes/SoccerSim").then((m) => ({ default: m.SoccerSim }))),
  papaya: lazy(() => import("./sim-modes/PapayaSim").then((m) => ({ default: m.PapayaSim }))),
  frog: lazy(() => import("./sim-modes/FrogSim").then((m) => ({ default: m.FrogSim }))),
  meadow: lazy(() => import("./sim-modes/MeadowSim").then((m) => ({ default: m.MeadowSim }))),
  bench: lazy(() => import("./sim-modes/BenchSim").then((m) => ({ default: m.BenchSim }))),
};

export type SimModeId =
  | "pond"
  | "sheep"
  | "beach"
  | "rocks"
  | "magnify"
  | "ocean"
  | "soccer"
  | "papaya"
  | "frog"
  | "meadow"
  | "bench";

const MODES: SimModeId[] = [
  "pond",
  "sheep",
  "beach",
  "rocks",
  "magnify",
  "ocean",
  "soccer",
  "papaya",
  "frog",
  "meadow",
  "bench",
];

/** Modes with an ambient soundscape get an inline sound toggle (as on the original site). */
const SOUND_MODES = new Set<SimModeId>(["beach", "ocean", "meadow", "bench"]);

function subscribeSound(cb: () => void) {
  window.addEventListener(POND_SOUND_EVENT, cb);
  return () => window.removeEventListener(POND_SOUND_EVENT, cb);
}

export function DashboardSimSection({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { track } = useTrackEvent();
  const [mode, setMode] = useState<SimModeId>("pond");
  const [pondFeed, setPondFeed] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, pondSound.isEnabled, () => false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<SimModeId>(mode);
  const sessionStartRef = useRef(0);
  const impressionSentRef = useRef(false);
  const sessionEndSentRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const emitSessionEnd = useCallback(
    (endReason: "hidden" | "unmount") => {
      if (sessionEndSentRef.current) return;
      sessionEndSentRef.current = true;
      track("dashboard_pond_session_end", {
        duration_ms: Date.now() - sessionStartRef.current,
        mode: modeRef.current,
        end_reason: endReason,
      });
    },
    [track],
  );

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || impressionSentRef.current) return;
        impressionSentRef.current = true;
        track("dashboard_pond_impression", { mode: modeRef.current });
      },
      { threshold: 0.05 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [track]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        emitSessionEnd("hidden");
        return;
      }
      sessionStartRef.current = Date.now();
      sessionEndSentRef.current = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      emitSessionEnd("unmount");
    };
  }, [emitSessionEnd]);

  const selectMode = useCallback(
    (next: SimModeId) => {
      if (next === mode) return;
      track("dashboard_pond_mode_changed", { from_mode: mode, to_mode: next });
      setMode(next);
    },
    [mode, track],
  );

  const togglePondFeed = useCallback(() => {
    const enabled = !pondFeed;
    track("dashboard_pond_feed_toggled", { enabled });
    setPondFeed(enabled);
  }, [pondFeed, track]);

  const onPondFeedChange = useCallback(
    (enabled: boolean) => {
      if (pondFeed === enabled) return;
      track("dashboard_pond_feed_toggled", { enabled });
      setPondFeed(enabled);
    },
    [pondFeed, track],
  );

  const toggleModeSound = useCallback(() => {
    const enabled = pondSound.toggle();
    track("dashboard_pond_sound_toggled", { enabled, mode });
  }, [mode, track]);

  const pondHint = pondFeed
    ? t("dashboard.pond.feedMode", "Tap anywhere to feed the ducks")
    : t(
        "dashboard.pond.hint",
        "Tap water to add a duck · Use feed for ripples & fish",
      );

  const pondFrame = "relative w-full aspect-[4.01/3] max-h-[min(65vh,600px)]";
  const Sim = mode === "pond" ? null : SIMS[mode];

  return (
    <div ref={sectionRef} className={cn("w-full", className)}>
      {mode === "pond" ? (
        <p
          className={cn(
            "pointer-events-none mb-3 text-center tracking-wide text-muted-foreground",
            "text-[10px] sm:text-[11px]",
            pondFeed && "text-foreground/80",
          )}
        >
          {pondHint}
        </p>
      ) : null}

      <div className="relative overflow-visible pb-5">
        {Sim ? (
          <Suspense fallback={<div className="w-full" style={{ minHeight: 300 }} />}>
            <div key={mode} className="flex w-full items-center justify-center">
              <Sim />
            </div>
          </Suspense>
        ) : (
          <Suspense fallback={<div className={pondFrame} />}>
            <div className={pondFrame}>
              <PondViewport
                className="size-full"
                hideFeedBar
                feedMode={pondFeed}
                onFeedModeChange={onPondFeedChange}
              />
            </div>
          </Suspense>
        )}
      </div>

      {mode === "pond" ? (
        <PondFeedControl active={pondFeed} onClick={togglePondFeed} />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1">
        {MODES.map((id) => (
          <span key={id} className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-current={mode === id}
              onClick={() => selectMode(id)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide transition-colors sm:text-[11px]",
                mode === id
                  ? "bg-foreground/10 text-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`dashboard.pond.modes.${id}`, id)}
            </button>
            {mode === id && SOUND_MODES.has(id) ? (
              <PondSoundToggle enabled={soundOn} onToggle={toggleModeSound} />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
