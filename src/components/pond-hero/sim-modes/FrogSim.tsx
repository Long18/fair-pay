import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { sfx } from "../audio/sfx";
import { usePondTheme } from "../theme";
import { drawFlies, drawFrogs } from "./frog/draw";
import {
  FROG_CELL,
  FROG_FRAMES,
  FROG_SHEET_SRC,
  assignHunters,
  hitFrog,
  isMatureFly,
  scareFrog,
  spawnFly,
  spawnFrogs,
  stepFlies,
  stepFrogs,
  type Fly,
  type Frog,
} from "./frog/frogs";
import { loadSpriteSheet, type ShadowSprite, type SpriteSheet } from "./shared/sprite-sheet";
import { rgbCss } from "./shared/sim-frame";

const FRAME_INTERVAL = 1000 / 30;

/**
 * The original fills a full-viewport section with 180px frogs. Inside the dashboard column the
 * field is simulated at (roughly) that desktop size and scaled down, so frog size and spacing
 * keep their proportions; small fields get fewer frogs.
 */
const REFERENCE_W = 1440;
const REFERENCE_H = 900;
const REFERENCE_FROGS = 11;
const MIN_SCALE = 0.45;
const MIN_FROGS = 5;

const EDGE_FADE = "clamp(20px, 6%, 56px)";
const edgeMask = [
  `linear-gradient(to right, transparent, #000 ${EDGE_FADE}, #000 calc(100% - ${EDGE_FADE}), transparent)`,
  `linear-gradient(to bottom, transparent, #000 ${EDGE_FADE}, #000 calc(100% - ${EDGE_FADE}), transparent)`,
].join(", ");
const edgeMaskStyle: CSSProperties = {
  contain: "layout paint style",
  maskImage: edgeMask,
  WebkitMaskImage: edgeMask,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
};

/** Frogs — glass frogs hop around; tap empty space to release a fly, tap a frog to startle it. */
export function FrogSim({ className }: { className?: string }) {
  const theme = usePondTheme();
  const reducedMotion = useReducedMotion();
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    if (!field || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let frogs: Frog[] = [];
    const flies: Fly[] = [];
    let sheet: SpriteSheet | null = null;
    let shadows: ShadowSprite[] | null = null;
    let raf = 0;
    let visible = true;
    let lastTime = 0;
    let lastFrame = 0;
    let fieldW = 0;
    let fieldH = 0;
    let scale = 1;
    let worldW = 0;
    let worldH = 0;

    const draw = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!sheet) return;
      const k = dpr * scale;
      drawFrogs(ctx, frogs, sheet, shadows, k, worldW, worldH);
      drawFlies(ctx, flies, now);
    };

    const layout = () => {
      const w = field.clientWidth;
      const h = field.clientHeight;
      if (w === 0 || h === 0 || (w === fieldW && h === fieldH)) return;
      fieldW = w;
      fieldH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      scale = Math.min(1, Math.max(MIN_SCALE, Math.min(w / REFERENCE_W, h / REFERENCE_H)));
      worldW = w / scale;
      worldH = h / scale;
      const count = Math.round((REFERENCE_FROGS * worldW * worldH) / (REFERENCE_W * REFERENCE_H));
      frogs = spawnFrogs(worldW, worldH, Math.max(MIN_FROGS, Math.min(REFERENCE_FROGS, count)));
      if (reducedMotion) draw(performance.now());
    };

    const tick = (now: number) => {
      if (!visible || !sheet) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
      const since = now - lastFrame;
      if (since < FRAME_INTERVAL) return;
      lastFrame = now - (since % FRAME_INTERVAL);
      const dt = lastTime ? Math.min(now - lastTime, 60) : FRAME_INTERVAL;
      lastTime = now;
      for (const fly of flies) {
        if (!fly.targeted && isMatureFly(fly) && assignHunters(frogs, fly)) fly.targeted = true;
      }
      stepFlies(flies, frogs, dt, worldW, worldH);
      stepFrogs(frogs, dt, worldW, worldH);
      draw(now);
    };

    const start = () => {
      if (reducedMotion || raf || !visible || !sheet) return;
      lastTime = 0;
      lastFrame = 0;
      raf = requestAnimationFrame(tick);
    };

    const disposeSheet = loadSpriteSheet(
      FROG_SHEET_SRC,
      {
        frames: FROG_FRAMES,
        cell: (i) => [FROG_CELL * i, 0, FROG_CELL],
        blurPx: 12,
        tint: "rgba(34, 48, 24, 1)",
      },
      {
        onSheetReady: (s) => {
          sheet = s;
          if (reducedMotion) draw(performance.now());
          else start();
        },
        onShadowsReady: (s) => {
          shadows = s;
          if (reducedMotion) draw(performance.now());
        },
      },
    );

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { threshold: 0 },
    );
    io.observe(field);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 200);
    });
    ro.observe(field);

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const x = localX / scale;
      const y = localY / scale;
      const index = hitFrog(frogs, x, y);
      if (index >= 0) {
        scareFrog(frogs[index], x, y);
        sfx.croak(index, localX / rect.width);
      } else {
        flies.push(spawnFly(x, y));
        sfx.flick(localX / rect.width);
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    layout();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      disposeSheet();
    };
  }, [reducedMotion]);

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full max-h-[70vh] overflow-hidden sm:aspect-[16/10]",
        className,
      )}
      style={{ background: rgbCss(theme.backdropRgb) }}
    >
      <div ref={fieldRef} className="absolute inset-0 overflow-hidden" style={edgeMaskStyle} aria-hidden>
        <canvas
          ref={canvasRef}
          className="block size-full cursor-pointer"
          style={{ touchAction: "manipulation" }}
        />
      </div>
    </div>
  );
}
