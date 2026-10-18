import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { createAmbience } from "../audio/ambience";
import { sfx } from "../audio/sfx";
import { usePondTheme } from "../theme";
import { createOceanAmbience } from "./ocean/ambience";
import { createOceanProgram, type OceanProgram } from "./ocean/program";
import { OCEAN_MAX_SPAWNS } from "./ocean/shaders";

/** Seconds a tapped-in fish stays alive (matches `spawnedFish` in the shader). */
const SPAWN_LIFE = 4;
/** Below this canvas width the shader is compiled with fewer schools. */
const COMPACT_WIDTH = 600;
/** Ignore the emulated mousedown that follows a touchstart. */
const TOUCH_MOUSE_GUARD_MS = 800;

type Spawn = { x: number; y: number; time: number; seed: number };

/** Ocean — looking up through the abyss at a light shaft; tap to send a fish into the school. */
export function OceanSim({ className }: { className?: string }) {
  const theme = usePondTheme();
  const reducedMotion = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef(theme.backdropRgb);
  const reducedRef = useRef(reducedMotion);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
    redrawRef.current();
  }, [theme.backdropRgb]);

  useEffect(() => {
    reducedRef.current = reducedMotion;
    redrawRef.current();
  }, [reducedMotion]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;

    const fitCanvas = () => {
      const rect = box.getBoundingClientRect();
      canvas.width = Math.max(Math.round(rect.width), 1);
      canvas.height = Math.max(Math.round(rect.height), 1);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    fitCanvas();

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    let compact = canvas.width < COMPACT_WIDTH;
    let program: OceanProgram | null = createOceanProgram(gl, compact);
    if (!program) return;

    const applySize = (p: OceanProgram) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(p.uRes, canvas.width, canvas.height);
    };
    applySize(program);
    const bg = backdropRef.current;
    gl.clearColor(bg.r / 255, bg.g / 255, bg.b / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const spawns: Spawn[] = [];
    let startAt = performance.now();
    let pausedAt = 0;
    let visible = false;
    let running = false;
    let raf = 0;

    const clock = () => ((pausedAt || performance.now()) - startAt) / 1000;

    const addSpawn = (x: number, y: number) => {
      const t = clock();
      let kept = 0;
      for (const s of spawns) if (t - s.time < SPAWN_LIFE) spawns[kept++] = s;
      spawns.length = kept;
      if (spawns.length < OCEAN_MAX_SPAWNS) spawns.push({ x, y, time: t, seed: Math.random() });
    };

    const draw = (p: OceanProgram, t: number) => {
      const { r, g, b } = backdropRef.current;
      gl.uniform1f(p.uTime, t);
      gl.uniform3f(p.uBackdrop, r / 255, g / 255, b / 255);
      for (let i = 0; i < OCEAN_MAX_SPAWNS; i++) {
        const s = spawns[i];
        if (s) gl.uniform4f(p.uSpawns[i], s.x, s.y, s.time, s.seed);
        else gl.uniform4f(p.uSpawns[i], 0, 0, -20, 0);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const halt = () => {
      running = false;
      if (!pausedAt) pausedAt = performance.now();
    };

    const frame = () => {
      if (!visible || !program) {
        halt();
        return;
      }
      if (pausedAt) {
        startAt += performance.now() - pausedAt;
        pausedAt = 0;
      }
      const t = clock();
      draw(program, t);
      // Reduced motion: hold a still frame unless a tapped fish is still swimming in.
      if (reducedRef.current && !spawns.some((s) => t - s.time < SPAWN_LIFE)) {
        halt();
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!visible || running) return;
      running = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    };
    redrawRef.current = start;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        start();
      },
      { threshold: 0.15 },
    );
    io.observe(box);

    const ambience = createAmbience(createOceanAmbience());
    ambience.attach(box);

    let lastTouch = 0;
    const tap = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (clientX - rect.left) / rect.width;
      addSpawn(
        (clientX - rect.left) * (canvas.width / rect.width),
        (clientY - rect.top) * (canvas.height / rect.height),
      );
      sfx.dart(nx);
      ambience.cue("spawn", nx);
      start();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (performance.now() - lastTouch < TOUCH_MOUSE_GUARD_MS) return;
      tap(e.clientX, e.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (!e.touches.length) return;
      lastTouch = performance.now();
      tap(e.touches[0].clientX, e.touches[0].clientY);
    };
    box.addEventListener("mousedown", onMouseDown);
    box.addEventListener("touchstart", onTouchStart, { passive: true });

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fitCanvas();
        if (canvas.width <= 0 || canvas.height <= 0) return;
        const nextCompact = canvas.width < COMPACT_WIDTH;
        if (nextCompact !== compact) {
          const next = createOceanProgram(gl, nextCompact);
          if (next) {
            program?.dispose();
            program = next;
            compact = nextCompact;
          }
        }
        if (program) applySize(program);
        if (running) return;
        // Resizing clears the canvas; repaint the held frame when the loop is idle.
        if (visible && program) draw(program, clock());
      }, 150);
    });
    ro.observe(box);

    return () => {
      redrawRef.current = () => {};
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      ambience.dispose();
      io.disconnect();
      ro.disconnect();
      box.removeEventListener("mousedown", onMouseDown);
      box.removeEventListener("touchstart", onTouchStart);
      program?.dispose();
      program = null;
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative w-full aspect-[9/7] min-h-[420px] max-h-[min(80vh,800px)] cursor-pointer select-none",
        className,
      )}
      style={{ touchAction: "pan-y" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
