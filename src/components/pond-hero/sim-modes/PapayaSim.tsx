import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { sfx } from "../audio/sfx";
import { usePondTheme } from "../theme";
import {
  BLOOM_MS,
  BloomState,
  PAPAYA_FRAMES,
  PAPAYA_LAST_FRAME,
  PAPAYA_SHEET_SRC,
  advanceBloom,
  drawPapayas,
  hitPapaya,
  isBlooming,
  papayaCell,
  type Papaya,
} from "./papaya/bloom";
import { loadSpriteSheet, type ShadowSprite, type SpriteSheet } from "./shared/sprite-sheet";
import { rgbCss } from "./shared/sim-frame";

const FRAME_INTERVAL = 1000 / 30;

/** Papaya — tap the halved fruit and its seeds bloom into flowers; tap again to fold back. */
export function PapayaSim({ className }: { className?: string }) {
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

    let papayas: Papaya[] = [];
    let sheet: SpriteSheet | null = null;
    let shadows: ShadowSprite[] | null = null;
    let raf = 0;
    let visible = true;
    let lastTime = 0;
    let lastFrame = 0;
    let fieldW = 0;
    let fieldH = 0;

    const draw = () => {
      if (!sheet) return;
      const w = field.clientWidth;
      const h = field.clientHeight;
      ctx.clearRect(0, 0, w, h);
      drawPapayas(ctx, papayas, sheet, shadows, dpr, w, h);
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      papayas = [
        {
          x: w / 2,
          y: h / 2,
          size: Math.min(0.85 * Math.min(w, h), 627),
          rotation: 0,
          opacity: 1,
          state: BloomState.closed,
          phaseMs: 0,
          frame: 0,
        },
      ];
      draw();
    };

    const tick = (now: number) => {
      if (!visible || !sheet) {
        raf = 0;
        lastTime = now;
        return;
      }
      const since = now - lastFrame;
      if (since < FRAME_INTERVAL) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastFrame = now - (since % FRAME_INTERVAL);
      const dt = lastTime ? Math.min(now - lastTime, 60) : FRAME_INTERVAL;
      lastTime = now;
      advanceBloom(papayas, dt, field.clientWidth || 1);
      draw();
      raf = isBlooming(papayas) ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (raf) return;
      lastTime = 0;
      lastFrame = 0;
      raf = requestAnimationFrame(tick);
    };

    const disposeSheet = loadSpriteSheet(
      PAPAYA_SHEET_SRC,
      { frames: PAPAYA_FRAMES, cell: papayaCell, blurPx: 11, tint: "rgba(58, 36, 22, 1)" },
      {
        onSheetReady: (s) => {
          sheet = s;
          draw();
        },
        onShadowsReady: (s) => {
          shadows = s;
          if (!raf) draw();
        },
      },
    );

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting;
        if (!wasVisible && visible) {
          if (isBlooming(papayas)) start();
          else draw();
        }
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const index = hitPapaya(papayas, x, y);
      if (index < 0) return;
      const p = papayas[index];
      if (reducedMotion) {
        if (p.state === BloomState.closed) {
          p.state = BloomState.open;
          p.frame = PAPAYA_LAST_FRAME;
          draw();
        } else if (p.state === BloomState.open) {
          p.state = BloomState.closed;
          p.frame = 0;
          draw();
        }
        return;
      }
      if (p.state === BloomState.closed) {
        p.state = BloomState.opening;
        p.phaseMs = 0;
        p.frame = 0;
      } else if (p.state === BloomState.open) {
        p.state = BloomState.closing;
        p.phaseMs = BLOOM_MS;
        p.frame = PAPAYA_LAST_FRAME;
      }
      sfx.squish(x / rect.width);
      start();
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
        "relative aspect-square w-full max-h-[70vh] overflow-hidden sm:aspect-[16/10]",
        className,
      )}
      style={{ background: rgbCss(theme.backdropRgb) }}
    >
      <div
        ref={fieldRef}
        className="absolute inset-0 overflow-hidden"
        style={{ contain: "layout paint style" }}
        aria-hidden
      >
        <canvas
          ref={canvasRef}
          className="block size-full cursor-pointer"
          style={{ touchAction: "manipulation" }}
        />
      </div>
    </div>
  );
}
