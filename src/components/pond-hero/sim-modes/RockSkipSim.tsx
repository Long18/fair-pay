import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { sfx } from "../audio/sfx";
import { useWaveGL } from "../gl/use-wave-gl";
import { pondPlantBleed } from "../plants/pond-edge";
import { usePlantCanvas } from "../plants/use-plant-canvas";
import { usePondTheme } from "../theme";

const ROCK_COLORS = ["#9E9688", "#8A8580", "#A09078", "#787070", "#8A9098", "#928878"];

type StoneState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  v0: number;
  bounces: number;
  maxBounces: number;
  rotation: number;
  spin: number;
  curve: number;
  done: boolean;
  sinkProgress: number;
};

type Stone = {
  data: StoneState;
  el: HTMLDivElement;
  shadowEl: HTMLDivElement;
  bouncePop: number;
  sank: boolean;
};

function ringEl(x: number, y: number, size: number, border: string, opacity: number, dur: number) {
  const el = document.createElement("div");
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;pointer-events:none;
    width:${size}px;height:${size}px;border-radius:50%;border:${border};
    transform:translate(-50%,-50%);opacity:${opacity};
    transition:width ${dur}s cubic-bezier(0.2,0.8,0.3,1),height ${dur}s cubic-bezier(0.2,0.8,0.3,1),opacity ${dur + 0.1}s ease-out,border-width ${dur}s ease-out;`;
  return el;
}

function expand(el: HTMLDivElement, size: number, thin = false) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.opacity = "0";
      if (thin) el.style.borderWidth = "0.5px";
    }),
  );
}

function spawnSplash(layer: HTMLElement, x: number, y: number, strength: number) {
  const core = 4 + 4 * strength;
  const flash = document.createElement("div");
  flash.style.cssText = `position:absolute;left:${x}px;top:${y}px;pointer-events:none;
    width:${core}px;height:${core}px;border-radius:50%;
    background:radial-gradient(circle,rgba(255,255,255,0.8),rgba(255,255,255,0) 70%);
    transform:translate(-50%,-50%);opacity:1;transition:opacity 0.3s ease-out;`;
  layer.appendChild(flash);
  setTimeout(() => {
    flash.style.opacity = "0";
  }, 30);
  setTimeout(() => flash.remove(), 350);

  const ring = 30 + 30 * strength;
  const inner = ringEl(x, y, core, "1.5px solid rgba(255,255,255,0.45)", 0.8, 0.5);
  layer.appendChild(inner);
  expand(inner, ring, true);
  setTimeout(() => inner.remove(), 700);

  if (strength > 0.5) {
    const outerSize = 1.4 * ring;
    const outer = ringEl(x, y, core, "1px solid rgba(255,255,255,0.2)", 0.5, 0.7);
    layer.appendChild(outer);
    expand(outer, outerSize);
    setTimeout(() => outer.remove(), 900);
  }
}

function pebblePath(rx: number, ry: number): string {
  const n = 6 + Math.floor(3 * Math.random());
  const start = Math.random() * Math.PI * 2;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const r = 0.82 + 0.36 * Math.random();
    pts.push({ x: 12 + Math.cos(a) * rx * r, y: 12 + Math.sin(a) * ry * r });
  }
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C ${(p1.x + (p2.x - p0.x) * 0.35).toFixed(1)},${(p1.y + (p2.y - p0.y) * 0.35).toFixed(1)} ${(p2.x - (p3.x - p1.x) * 0.35).toFixed(1)},${(p2.y - (p3.y - p1.y) * 0.35).toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

/** Advance one stone; returns a bounce point when it touches the water. */
function stepStone(s: StoneState, dt: number): { x: number; y: number; bounce: number } | null {
  if (s.done) {
    s.sinkProgress = Math.min(1, s.sinkProgress + 0.5 * dt);
    return null;
  }
  s.vz -= 9 * dt;
  s.z += s.vz * dt;
  s.vx += s.curve * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.rotation += s.spin * dt;
  if (s.z <= 0) {
    s.z = 0;
    s.bounces++;
    const t = s.bounces / s.maxBounces;
    if (t >= 1 || Math.abs(s.vy) < 0.02) {
      s.done = true;
      return null;
    }
    const keep = Math.sqrt(1 - t);
    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (speed > 0.001) {
      const k = (s.v0 * keep) / speed;
      s.vx *= k;
      s.vy *= k;
    }
    s.vz = (0.5 + 0.35 * s.v0) * keep * keep * (0.9 + 0.2 * Math.random());
    return { x: s.x, y: s.y, bounce: s.bounces };
  }
  if (s.x < -0.1 || s.x > 1.1 || s.y < -0.15 || s.y > 1.1) s.done = true;
  return null;
}

/** Rocks — tap the pond to skip a pebble across the water. */
export function RockSkipSim({ className }: { className?: string }) {
  const theme = usePondTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLCanvasElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const plantRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const visibleRef = useRef(true);
  const stonesRef = useRef<Stone[]>([]);
  const innerSizeRef = useRef<{ w: number; h: number } | null>(null);
  const [bleed, setBleed] = useState(() => pondPlantBleed(400, true));

  const { triggerRippleAt, timeRef, resume: resumeWave } = useWaveGL(
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
    { includeTop: true },
  );

  const throwStone = useCallback(
    (clientX: number, clientY: number) => {
      const box = boxRef.current;
      const fx = fxRef.current;
      if (!box || !fx) return;
      const rect = box.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;

      const shadowEl = document.createElement("div");
      shadowEl.style.cssText =
        "position:absolute;pointer-events:none;width:10px;height:6px;border-radius:50%;background:rgba(0,0,0,0.15);filter:blur(2px);transform:translate(-50%,-50%);will-change:transform,opacity;";
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;pointer-events:none;will-change:transform,opacity;mix-blend-mode:multiply;";
      const color = ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)];
      const path = pebblePath(4.5 + 1.5 * Math.random(), 3.5 + Math.random());
      el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
<path d="${path}" fill="${color}" opacity="0.7"/>
<path d="${path}" fill="none" stroke="${color}" stroke-width="0.8" opacity="0.25"/>
</svg>`;
      fx.append(shadowEl, el);

      const power = 0.7 + 0.3 * Math.random();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      const v0 = 0.4 + 0.3 * power;
      stonesRef.current.push({
        data: {
          x: nx,
          y: ny,
          vx: Math.cos(angle) * v0,
          vy: Math.sin(angle) * v0,
          z: 0.05 + 0.06 * power,
          vz: 0.55 + 0.25 * power,
          v0,
          bounces: 0,
          maxBounces: 6 + Math.floor(8 * power),
          rotation: 360 * Math.random(),
          spin: 400 + 200 * Math.random(),
          curve: (Math.random() - 0.5) * 0.06,
          done: false,
          sinkProgress: 0,
        },
        el,
        shadowEl,
        bouncePop: 0,
        sank: false,
      });
      triggerRippleAt(nx, ny, 1.2);
      spawnSplash(fx, nx * rect.width, ny * rect.height, 1);
      sfx.splash(nx);
    },
    [triggerRippleAt],
  );

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w > 0 && h > 0) {
        innerSizeRef.current = { w, h };
        setBleed(pondPlantBleed(Math.min(w, h), true));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let last = 0;
    const tick = (now: number) => {
      if (!visibleRef.current) return;
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const fx = fxRef.current;
      const stones = stonesRef.current;
      for (let i = stones.length - 1; i >= 0; i--) {
        const stone = stones[i];
        const s = stone.data;
        const hit = stepStone(s, dt);
        if (hit) {
          const strength = Math.max(0.3, 1 - 0.12 * hit.bounce);
          triggerRippleAt(hit.x, hit.y, strength);
          stone.bouncePop = 1;
          if (fx) spawnSplash(fx, hit.x * w, hit.y * h, strength);
          sfx.skip(hit.bounce, hit.x, strength);
        }
        if (s.done && !stone.sank) {
          stone.sank = true;
          if (s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1) sfx.sink(s.x);
        }
        stone.bouncePop = Math.max(0, stone.bouncePop - 6 * dt);
        const px = s.x * w;
        const py = s.y * h;
        const scale =
          (1 + 1.2 * s.z) * (1 + 0.4 * stone.bouncePop) * (s.done ? 1 - 0.5 * s.sinkProgress : 1);
        stone.el.style.left = `${px}px`;
        stone.el.style.top = `${py}px`;
        stone.el.style.transform = `translate(-50%,-50%) scale(${scale.toFixed(3)}) rotate(${s.rotation.toFixed(1)}deg)`;
        stone.el.style.opacity = (s.done ? 1 - s.sinkProgress : 1).toFixed(2);
        stone.shadowEl.style.left = `${px}px`;
        stone.shadowEl.style.top = `${(py + 14 * s.z).toFixed(1)}px`;
        stone.shadowEl.style.opacity = (s.done ? 0 : Math.min(0.25, 0.08 + 0.8 * s.z)).toFixed(2);
        stone.shadowEl.style.transform = `translate(-50%,-50%) scale(${(1 + 0.8 * s.z).toFixed(2)})`;
        if (s.done && s.sinkProgress >= 1) {
          stone.el.remove();
          stone.shadowEl.remove();
          stones.splice(i, 1);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasHidden = !visibleRef.current;
        visibleRef.current = entry.isIntersecting;
        if (wasHidden && entry.isIntersecting) {
          last = 0;
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(tick);
          resumeWave();
          resumePlants();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(box);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      io.disconnect();
      for (const s of stonesRef.current) {
        s.el.remove();
        s.shadowEl.remove();
      }
      stonesRef.current = [];
    };
  }, [resumePlants, resumeWave, triggerRippleAt]);

  return (
    <div className={cn("relative w-full aspect-[5/4] max-h-[min(80vh,720px)]", className)}>
      <div
        ref={boxRef}
        className="relative size-full cursor-pointer overflow-hidden rounded-sm outline-none"
        style={{ touchAction: "pan-y" }}
        onClick={(e) => throwStone(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches.length > 0) throwStone(e.touches[0].clientX, e.touches[0].clientY);
        }}
      >
        <div className="absolute inset-[1.25px] overflow-hidden">
          <canvas
            ref={waterRef}
            className="pointer-events-none absolute"
            style={{ inset: "-1.25px", width: "calc(100% + 2.5px)", height: "calc(100% + 2.5px)" }}
          />
          <div ref={fxRef} className="absolute inset-0" style={{ zIndex: 5, pointerEvents: "none" }} />
          <canvas
            ref={paperRef}
            className="pointer-events-none absolute"
            style={{
              inset: "-1.25px",
              width: "calc(100% + 2.5px)",
              height: "calc(100% + 2.5px)",
              zIndex: 6,
            }}
          />
        </div>
      </div>
      <canvas
        ref={plantRef}
        className="pointer-events-none absolute"
        style={{
          top: -bleed.top,
          left: -bleed.left,
          width: `calc(100% + ${bleed.left + bleed.right}px)`,
          height: `calc(100% + ${bleed.top + bleed.bottom}px)`,
          zIndex: 7,
        }}
        aria-hidden
      />
    </div>
  );
}
