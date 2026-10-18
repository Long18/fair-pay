import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePondTheme } from "../theme";
import {
  COLONY_SIZE,
  createTrailColumn,
  heatAnts,
  maybeSpawnQueen,
  respawnAnts,
  spawnAnt,
  updateColony,
  updateTrailColumn,
  zapBurntAnts,
} from "./magnify/ants";
import { drawAnt, drawBurnGlow, drawTrail } from "./magnify/draw-ant";
import { renderGround } from "./magnify/ground";
import { HANDLE_ANGLE, drawLens } from "./magnify/lens";
import { burnNest, createNest, drawNest, nestPanic } from "./magnify/nest";
import { drawParticles, updateParticles } from "./magnify/particles";
import { TreeShadow } from "./magnify/tree-shadow";
import type { Ant, Circle, Particle, Pointer, Scorch } from "./magnify/types";
import { lensRadius } from "./magnify/util";
import { simFont } from "./shared/sim-font";
import { renderSimOverlay } from "./shared/sim-frame";

/** Grow a scorch mark where the sunspot lingers; marks slowly fade. */
function updateScorches(
  marks: Scorch[],
  fx: number,
  fy: number,
  dwell: { value: number },
  last: { x: number; y: number },
  dt: number,
  particles: Particle[],
  active: boolean,
) {
  if (active) {
    const dx = fx - last.x;
    const dy = fy - last.y;
    if (dx * dx + dy * dy < 64) {
      dwell.value += dt;
      if (dwell.value > 1.5) {
        let mark: Scorch | undefined;
        for (const m of marks) {
          const mx = m.x - fx;
          const my = m.y - fy;
          if (mx * mx + my * my < 100) {
            mark = m;
            break;
          }
        }
        if (mark) {
          mark.r = Math.min(mark.r + 2 * dt, 14);
          mark.alpha = Math.min(mark.alpha + 0.08 * dt, 0.35);
        } else {
          marks.push({ x: fx, y: fy, r: 3, alpha: 0.06 });
        }
        if (Math.random() < 3 * dt) {
          particles.push({
            x: fx + (Math.random() - 0.5) * 6,
            y: fy,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -12 - 10 * Math.random(),
            life: 0.8 + 0.6 * Math.random(),
            decay: 0.5 + 0.3 * Math.random(),
            size: 3 + 4 * Math.random(),
            sizeEnd: 8 + 6 * Math.random(),
            type: "smoke",
            r: 60,
            g: 50,
            b: 40,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    } else {
      dwell.value = 0;
    }
    last.x = fx;
    last.y = fy;
  } else {
    dwell.value = 0;
  }
  const fade = 0.003 * dt;
  for (let i = marks.length - 1; i >= 0; i--) {
    marks[i].alpha -= fade;
    if (marks[i].alpha <= 0.005) marks.splice(i, 1);
  }
}

function drawScorches(ctx: CanvasRenderingContext2D, marks: Scorch[]) {
  for (const m of marks) {
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
    g.addColorStop(0, `rgba(30, 20, 10, ${m.alpha})`);
    g.addColorStop(0.5, `rgba(40, 25, 12, ${0.6 * m.alpha})`);
    g.addColorStop(1, "rgba(50, 30, 15, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, 2 * Math.PI);
    ctx.fill();
  }
}

/** Magnify — focus sunlight with a magnifying glass over a patch of sand full of foraging ants. */
export function MagnifySim({ className }: { className?: string }) {
  const theme = usePondTheme();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef(theme.backdropRgb);
  const repaintRef = useRef<(() => void) | null>(null);
  const zappedLabelRef = useRef((count: number) => `${count} zapped`);

  useEffect(() => {
    zappedLabelRef.current = (count: number) =>
      t("dashboard.pond.sims.magnify.zapped", "{{count}} zapped", { count });
  }, [t]);

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
    repaintRef.current?.();
  }, [theme.backdropRgb]);

  useEffect(() => {
    const root = rootRef.current;
    const ground = groundRef.current;
    const sim = simRef.current;
    const overlay = overlayRef.current;
    if (!root || !ground || !sim || !overlay) return;
    const ctx = sim.getContext("2d");
    const snapshot = document.createElement("canvas");
    const snapCtx = snapshot.getContext("2d");
    if (!ctx || !snapCtx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let ants: Ant[] = [];
    let trailAnts: Ant[] = [];
    const particles: Particle[] = [];
    const zapped = { value: 0 };
    const respawnTimers = new Map<number, number>();
    const pointer: Pointer = { x: -9999, y: -9999, down: false, entered: false };
    const scorches: Scorch[] = [];
    const dwell = { value: 0 };
    const lastFocus = { x: -1, y: -1 };
    let queenTimer = 15 + 20 * Math.random();
    let obstacle: Circle = { x: 0, y: 0, r: 0 };
    let nest = createNest(1, 1);
    const tree = new TreeShadow();
    let paintedKey = "";
    let visible = false;
    let raf = 0;
    let last = 0;

    const paintStatic = () => {
      if (w <= 0 || h <= 0) return;
      const bd = backdropRef.current;
      const key = `${w}x${h}:${bd.r},${bd.g},${bd.b}`;
      if (key === paintedKey) return;
      paintedKey = key;
      obstacle = renderGround(ground, w, h, bd);
      renderSimOverlay(overlay, w, h, bd);
    };
    repaintRef.current = paintStatic;

    const reset = () => {
      const nw = root.clientWidth;
      const nh = root.clientHeight;
      if (nw <= 0 || nh <= 0 || (nw === w && nh === h)) return;
      w = nw;
      h = nh;
      paintStatic();
      dpr = Math.min(devicePixelRatio || 1, 2);
      sim.width = w * dpr;
      sim.height = h * dpr;
      sim.style.width = `${w}px`;
      sim.style.height = `${h}px`;
      snapshot.width = w * dpr;
      snapshot.height = h * dpr;
      ants = [];
      while (ants.length < COLONY_SIZE) ants.push(spawnAnt(w, h, false));
      nest = createNest(w, h);
      for (let i = 0; i < Math.min(3, ants.length); i++) {
        const ant = ants[i];
        ant.x = nest.cx + (Math.random() - 0.5) * 25;
        ant.y = nest.cy + (Math.random() - 0.5) * 25;
        ant.angle = Math.random() * Math.PI * 2;
        ant.targetAngle = ant.angle;
      }
      trailAnts = createTrailColumn(w, h);
      particles.length = 0;
      respawnTimers.clear();
      zapped.value = 0;
    };
    reset();

    const frame = (now: number) => {
      if (!visible) {
        raf = 0;
        return;
      }
      if (!last) last = now;
      const dt = Math.min((now - last) / 1e3, 0.05);
      const time = now / 1e3;
      last = now;
      if (w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        updateColony(ants, dt, w, h, obstacle, nest);
        updateTrailColumn(trailAnts, dt, w, h);

        let fx = 0;
        let fy = 0;
        if (pointer.entered) {
          fx = pointer.x;
          fy = pointer.y + 16;
          heatAnts(ants, fx, fy, dt, w);
          heatAnts(trailAnts, fx, fy, dt, w);
          zapBurntAnts(ants, particles, zapped, w);
          zapBurntAnts(trailAnts, particles, zapped, w);
          if (!nest.collapsed) {
            burnNest(nest, fx, fy, dt, particles);
            if (nest.burnPercent >= 0.35 && !nest.panicTriggered) nestPanic(nest, ants, w, h);
          }
        } else {
          for (const ant of ants) {
            if (ant.alive && ant.burnProgress > 0) ant.burnProgress = Math.max(0, ant.burnProgress - 1.2 * dt);
          }
          for (const ant of trailAnts) {
            if (ant.alive && ant.burnProgress > 0) ant.burnProgress = Math.max(0, ant.burnProgress - 1.2 * dt);
          }
        }

        updateScorches(scorches, fx, fy, dwell, lastFocus, dt, particles, pointer.entered);
        respawnAnts(ants, respawnTimers, dt, w, h);
        queenTimer -= dt;
        if (queenTimer <= 0) queenTimer = maybeSpawnQueen(ants, w, h);
        updateParticles(particles, dt, time);

        tree.draw(ctx, w, h, time);
        drawScorches(ctx, scorches);
        if (!nest.collapsed) drawNest(ctx, nest);
        for (const ant of trailAnts) drawTrail(ctx, ant);
        for (const ant of ants) drawTrail(ctx, ant);
        for (const ant of trailAnts) drawBurnGlow(ctx, ant);
        for (const ant of ants) drawBurnGlow(ctx, ant);
        for (const ant of trailAnts) drawAnt(ctx, ant);
        for (const ant of ants) drawAnt(ctx, ant);
        drawParticles(ctx, particles);

        if (pointer.entered) {
          const lx = pointer.x;
          const ly = pointer.y;
          const R = lensRadius(w, h);
          const inner = R - 0.055 * R * 0.5;
          const half = inner / 2;
          snapCtx.clearRect(0, 0, snapshot.width, snapshot.height);
          snapCtx.drawImage(sim, 0, 0);
          ctx.save();
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.beginPath();
          ctx.arc(lx, ly, inner, 0, 2 * Math.PI);
          ctx.clip();
          const sx = (lx - half) * dpr;
          const sy = (ly - half) * dpr;
          const ss = 2 * half * dpr;
          ctx.drawImage(ground, sx, sy, ss, ss, lx - inner, ly - inner, 2 * inner, 2 * inner);
          ctx.drawImage(snapshot, sx, sy, ss, ss, lx - inner, ly - inner, 2 * inner, 2 * inner);
          const vignette = ctx.createRadialGradient(lx, ly, 0.5 * inner, lx, ly, inner);
          vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
          vignette.addColorStop(0.7, "rgba(0, 0, 0, 0)");
          vignette.addColorStop(0.88, "rgba(0, 0, 0, 0.03)");
          vignette.addColorStop(0.96, "rgba(0, 0, 0, 0.07)");
          vignette.addColorStop(1, "rgba(0, 0, 0, 0.12)");
          ctx.fillStyle = vignette;
          ctx.fillRect(lx - inner, ly - inner, 2 * inner, 2 * inner);
          ctx.restore();
          drawLens(ctx, lx, ly, fx, fy, time, w, h, true);
        }

        if (zapped.value > 0) {
          ctx.save();
          ctx.font = simFont(11);
          ctx.fillStyle = "rgba(42, 37, 32, 0.35)";
          ctx.textAlign = "right";
          ctx.fillText(zappedLabelRef.current(zapped.value), w - 16, 24);
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(root);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(reset, 200);
    });
    ro.observe(root);

    const toLocal = (clientX: number, clientY: number) => {
      const rect = root.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    /** On touch the lens sits up-left of the finger, which holds the handle. */
    const touchOffset = () => {
      const R = lensRadius(w, h);
      const reach = R + 1.3 * R * 0.55;
      return { dx: -Math.cos(HANDLE_ANGLE) * reach, dy: -Math.sin(HANDLE_ANGLE) * reach };
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const p = toLocal(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.down = true;
      pointer.entered = true;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const p = toLocal(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.entered = true;
    };
    const onPointerUp = () => {
      pointer.down = false;
    };
    const onPointerLeave = () => {
      pointer.down = false;
      pointer.entered = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return;
      e.preventDefault();
      const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
      const o = touchOffset();
      pointer.x = p.x + o.dx;
      pointer.y = p.y + o.dy;
      pointer.down = true;
      pointer.entered = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!e.touches.length) return;
      e.preventDefault();
      const p = toLocal(e.touches[0].clientX, e.touches[0].clientY);
      const o = touchOffset();
      pointer.x = p.x + o.dx;
      pointer.y = p.y + o.dy;
    };
    const onTouchEnd = () => {
      pointer.down = false;
      pointer.entered = false;
    };
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("touchstart", onTouchStart, { passive: false });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      repaintRef.current = null;
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("relative aspect-square w-full max-w-[520px] cursor-none select-none", className)}
      style={{ touchAction: "none" }}
    >
      <canvas ref={groundRef} className="absolute inset-0 size-full" />
      <canvas ref={simRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" style={{ zIndex: 2 }} aria-hidden />
    </div>
  );
}
