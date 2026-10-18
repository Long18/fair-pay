import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { usePondTheme } from "../theme";
import { StillContext } from "./meadow/clock";
import { MeadowScene } from "./meadow/Scene";
import { blurWorld, meadowKey, quietWorld, showAim } from "./meadow/controls";
import { createMeadowWorld } from "./meadow/simulation";
import { rgbCss } from "./shared/sim-frame";

const EDGE_MASK = "url(/pond-hero/meadow/meadow-edge.svg)";
const DPR: [number, number] = [1, 1.5];
const GL = { alpha: true, antialias: false, powerPreference: "high-performance" as const };

const maskStyle: CSSProperties = {
  touchAction: "pan-y",
  maskImage: EDGE_MASK,
  WebkitMaskImage: EDGE_MASK,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

/** Meadow — a tilt-shift miniature pasture. Click grass to drop a sheep, drag sheep around, stack them. */
export function MeadowSim({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = usePondTheme();
  const reducedMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const invalidateRef = useRef<() => void>(() => {});
  const world = useMemo(() => createMeadowWorld(), []);
  const describedBy = useId();
  const [status, setStatus] = useState("");
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const drawable = typeof window !== "undefined" && "WebGL2RenderingContext" in window;

  const announceSpawn = useCallback(
    (count: number) =>
      setStatus(
        t("dashboard.pond.sims.meadow.dropped", "A sheep dropped into the meadow. {{count}} sheep are here now.", {
          count,
        }),
      ),
    [t],
  );
  const onCreated = useCallback((state: RootState) => {
    invalidateRef.current = state.invalidate;
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const seen = { onScreen: false };
    const sync = () => {
      if (document.hidden || !seen.onScreen) quietWorld(world);
      setVisible(seen.onScreen);
      setHidden(document.hidden);
    };
    const io = new IntersectionObserver(([entry]) => {
      seen.onScreen = entry.isIntersecting;
      sync();
    });
    if (host) io.observe(host);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      quietWorld(world);
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [world]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const outcome = meadowKey(world, e.key, e.repeat);
    if (outcome === "ignored") return;
    e.preventDefault();
    if (outcome === "spawned") announceSpawn(world.sheepCount);
    else if (outcome === "full") setStatus(t("dashboard.pond.sims.meadow.full", "The meadow is full of sheep."));
    else if (outcome === "empty") setStatus(t("dashboard.pond.sims.meadow.emptyPatch", "Choose an empty patch of grass."));
    invalidateRef.current();
  };

  const paused = !visible || hidden;
  return (
    <div className={cn("@container w-full", className)}>
      <div
        ref={hostRef}
        role="button"
        tabIndex={0}
        aria-label={t("dashboard.pond.sims.meadow.label", "Drop a sheep into the meadow")}
        aria-describedby={describedBy}
        className={cn(
          "relative mx-auto aspect-[5/4] w-full max-w-[min(900px,calc(125svh-150px))] cursor-pointer outline-none",
          "@max-[600px]:aspect-[4/5] @max-[600px]:max-w-[calc(80svh-76.8px)]",
        )}
        style={{ ...maskStyle, backgroundColor: rgbCss(theme.backdropRgb) }}
        onFocus={() => {
          showAim(world);
          invalidateRef.current();
        }}
        onBlur={() => {
          blurWorld(world);
          invalidateRef.current();
        }}
        onKeyDown={onKeyDown}
      >
        <span id={describedBy} className="sr-only">
          {t(
            "dashboard.pond.sims.meadow.instructions",
            "Click grass or an existing sheep to add a sheep. Drag a sheep to move it; drop it onto another to stack them. Arrow keys move the landing marker, G picks up a nearby sheep, Enter or Space adds or drops one, and Escape releases it.",
          )}
        </span>
        <span className="sr-only" role="status">
          {status}
        </span>
        {drawable ? (
          <Canvas
            onCreated={onCreated}
            shadows="percentage"
            frameloop={paused ? "never" : reducedMotion ? "demand" : "always"}
            dpr={DPR}
            gl={GL}
            aria-hidden="true"
          >
            <StillContext.Provider value={reducedMotion}>
              <MeadowScene still={reducedMotion} world={world} backdrop={theme.backdropRgb} onSpawn={announceSpawn} />
            </StillContext.Provider>
          </Canvas>
        ) : null}
      </div>
    </div>
  );
}
