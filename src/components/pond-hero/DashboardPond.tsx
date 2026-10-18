import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { DuckSvg } from "./DuckSvg";
import { FishSvg } from "./FishSvg";
import { PersonSvg } from "./PersonSvg";
import { useWaveGL } from "./gl/use-wave-gl";
import { pondPlantBleed } from "./plants/pond-edge";
import { usePlantCanvas } from "./plants/use-plant-canvas";
import { PondCloseIcon, PondFeedIcon } from "./PondIcons";
import { PondSoundToggle } from "./PondSoundToggle";
import { pondSound } from "./sound";
import { usePondTheme } from "./theme";
import { usePondLayout } from "./use-pond-layout";
import { usePondScene } from "./use-pond-scene";

export function PondFeedControl({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex justify-center pt-3 pb-1">
      <button
        type="button"
        onClick={onClick}
        aria-label={active ? "Exit feed mode" : "Feed the ducks"}
        className="cursor-pointer border-0 bg-transparent p-0 shadow-none transition-transform duration-300 hover:scale-110 active:scale-95"
      >
        {active ? <PondCloseIcon /> : <PondFeedIcon />}
      </button>
    </div>
  );
}

/** Water + entities + plants (fits inside sim preview frame). */
export function PondViewport({
  className,
  hideFeedBar = false,
  showHint = false,
  feedMode: feedModeProp,
  onFeedModeChange,
}: {
  className?: string;
  hideFeedBar?: boolean;
  showHint?: boolean;
  feedMode?: boolean;
  onFeedModeChange?: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const theme = usePondTheme();
  const [soundOn, setSoundOn] = useState(() => pondSound.isEnabled());
  const shellRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const plantRef = useRef<HTMLCanvasElement>(null);
  const pondRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(true);
  const seededRef = useRef(false);
  const innerSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [plantBleed, setPlantBleed] = useState(() =>
    pondPlantBleed(400),
  );

  const layout = usePondLayout(shellRef);

  const { timeRef, triggerRippleAt, resume: resumeWave } = useWaveGL(
    waterRef,
    paperRef,
    visibleRef,
    theme,
  );

  const { resume: resumePlants } = usePlantCanvas(
    plantRef,
    timeRef,
    visibleRef,
    innerSizeRef,
  );

  const {
    renderEntities,
    foodVisuals,
    feedMode: feedModeOn,
    toggleFeedMode,
    handleTap,
    onEntityClick,
    seedInitial,
    resume: resumeScene,
    speech,
  } = usePondScene({
    containerRef: pondRef,
    timeRef,
    visibleRef,
    onRipple: triggerRippleAt,
    feedMode: feedModeProp,
    onFeedModeChange,
  });

  useEffect(() => {
    const el = pondRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        innerSizeRef.current = { w, h };
        setPlantBleed(pondPlantBleed(Math.min(w, h)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = pondRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          resumeWave();
          resumePlants();
          resumeScene();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [resumePlants, resumeScene, resumeWave]);

  useEffect(() => {
    if (reducedMotion || seededRef.current) return;
    let raf = 0;
    const trySeed = () => {
      if ((timeRef.current ?? 0) > 0) {
        seededRef.current = true;
        seedInitial();
        return;
      }
      raf = requestAnimationFrame(trySeed);
    };
    raf = requestAnimationFrame(trySeed);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, seedInitial, timeRef]);

  const speechAnchor =
    speech && renderEntities[speech.entityIndex]
      ? renderEntities[speech.entityIndex]
      : null;

  const hint = feedModeOn
    ? t("dashboard.pond.feedMode", "Tap anywhere to feed the ducks")
    : layout.isNarrow
      ? t("dashboard.pond.hintMobile", "Tap water to add a duck")
      : t(
          "dashboard.pond.hint",
          "Tap water to add a duck · Use feed for ripples & fish",
        );

  const fishSize = Math.round(44 * layout.entityScale);

  if (reducedMotion) {
    return null;
  }

  return (
    <div ref={shellRef} className={cn("flex size-full flex-col", className)}>
      {showHint ? (
        <p
          className={cn(
            "pointer-events-none shrink-0 pb-2 text-center tracking-wide text-muted-foreground",
            "text-[10px] sm:text-[11px]",
            feedModeOn && "text-foreground/80",
          )}
        >
          {hint}
        </p>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={pondRef}
          className="relative size-full touch-manipulation outline-none"
          style={{ cursor: feedModeOn ? "crosshair" : "pointer" }}
          onClick={(e) => handleTap(e.clientX, e.clientY)}
        >
          <div className="absolute inset-0">
            <canvas
              ref={waterRef}
              className="pointer-events-none absolute inset-0 size-full"
            />
            <canvas
              ref={paperRef}
              className="pointer-events-none absolute inset-0 size-full"
            />

            {foodVisuals.map((group) => (
              <div key={group.foodId} className="pointer-events-none absolute inset-0">
                {group.pellets.map((p, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${p.x * 100}%`,
                      top: `${p.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: p.size * layout.entityScale,
                        height: p.size * layout.entityScale,
                        background: `radial-gradient(circle, hsla(${p.hue}, 55%, 58%, 0.55) 0%, hsla(${p.hue}, 45%, 42%, 0.25) 70%, transparent 100%)`,
                        filter: `blur(${p.blur}px)`,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}

            {renderEntities.map((ent) => (
              <div
                key={ent.id}
                className="absolute"
                style={{
                  left: `${ent.nx * 100}%`,
                  top: `${ent.ny * 100}%`,
                  transform: `translate(-50%, -50%) translateY(${-ent.offsetY}px) rotate(${ent.rotation}deg) scale(${ent.scale * layout.entityScale})`,
                  opacity: ent.opacity,
                  willChange: "transform, opacity",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEntityClick(ent.id, ent.nx);
                }}
              >
                {ent.kind === "fish" ? (
                  <FishSvg size={fishSize} burst={ent.burst} />
                ) : ent.kind === "person" ? (
                  <PersonSvg color={ent.personColor} />
                ) : (
                  <DuckSvg paddling={ent.paddling} mallard={ent.mallard} />
                )}
              </div>
            ))}
          </div>

          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
            <PondSoundToggle
              enabled={soundOn}
              onToggle={() => setSoundOn(pondSound.toggle())}
            />
          </div>
        </div>

        <canvas
          ref={plantRef}
          className="pointer-events-none absolute"
          style={{
            top: -plantBleed.top,
            left: -plantBleed.left,
            width: `calc(100% + ${plantBleed.left + plantBleed.right}px)`,
            height: `calc(100% + ${plantBleed.top + plantBleed.bottom}px)`,
            zIndex: 7,
          }}
          aria-hidden
        />

        <AnimatePresence>
          {speech && speechAnchor ? (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              className="pointer-events-none absolute z-20"
              style={{
                left: `${speechAnchor.nx * 100}%`,
                top: `${speechAnchor.ny * 100}%`,
                transform: "translate(-50%, -120%)",
              }}
            >
              <div
                className={cn(
                  "relative max-w-[min(200px,70vw)] rounded-xl border border-border/60 bg-popover px-3 py-1 shadow-sm",
                  layout.isNarrow && "max-w-[min(180px,78vw)]",
                )}
              >
                <p
                  className={cn(
                    "m-0 leading-relaxed text-popover-foreground",
                    "text-[10px] sm:text-[11px]",
                  )}
                >
                  {speech.text}
                </p>
                <div
                  className="absolute -bottom-[5px] left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-b border-r border-border/60 bg-popover"
                  aria-hidden
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!hideFeedBar ? (
        <PondFeedControl
          active={feedModeOn}
          onClick={() => {
            if (onFeedModeChange) onFeedModeChange(!feedModeOn);
            else toggleFeedMode();
          }}
        />
      ) : null}
    </div>
  );
}

export { DashboardSimSection as DashboardPond } from "./DashboardSimSection";
