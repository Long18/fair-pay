import { lazy, Suspense, useState, useSyncExternalStore, type ComponentType } from "react";
import { PondFeedControl } from "./DashboardPond";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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
  const [mode, setMode] = useState<SimModeId>("pond");
  const [pondFeed, setPondFeed] = useState(false);
  const soundOn = useSyncExternalStore(subscribeSound, pondSound.isEnabled, () => false);

  const pondHint = pondFeed
    ? t("dashboard.pond.feedMode", "Tap anywhere to feed the ducks")
    : t(
        "dashboard.pond.hint",
        "Tap water to add a duck · Use feed for ripples & fish",
      );

  const pondFrame = "relative w-full aspect-[4.01/3] max-h-[min(65vh,600px)]";
  const Sim = mode === "pond" ? null : SIMS[mode];

  return (
    <div className={cn("w-full", className)}>
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
                onFeedModeChange={setPondFeed}
              />
            </div>
          </Suspense>
        )}
      </div>

      {mode === "pond" ? (
        <PondFeedControl
          active={pondFeed}
          onClick={() => setPondFeed((v) => !v)}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 px-1">
        {MODES.map((id) => (
          <span key={id} className="inline-flex items-center gap-1">
            <button
              type="button"
              aria-current={mode === id}
              onClick={() => setMode(id)}
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
              <PondSoundToggle enabled={soundOn} onToggle={() => pondSound.toggle()} />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
