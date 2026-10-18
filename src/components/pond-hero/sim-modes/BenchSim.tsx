import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { createAmbience } from "../audio/ambience";
import { usePondTheme } from "../theme";
import { createBenchAmbience } from "./bench/audio";
import { drawSpeech, rippleUniforms } from "./bench/fx";
import { buildTerrainMap } from "./bench/layout";
import { createBenchRenderer, type BenchRenderer } from "./bench/renderer";
import { createLayers, createWorld, renderLayers, stepWorld, tapWorld, type BenchLines, type Layers, type World } from "./bench/world";
import { renderSimOverlay } from "./shared/sim-frame";

const FRAME_MS = 1000 / 30;

const MUSINGS = [
  "alright. five more minutes",
  "left my coffee on the counter",
  "that duck's got somewhere to be",
  "i quit in 2019. also in 2021",
  "what time is it? actually don't tell me",
  "should've brought a jacket",
  "nice out today",
  "is that a turtle or a rock?",
  "i should call my mother",
  "yeah. i know. bad for me",
  "this is my last one. probably",
  "go ahead, sit down",
  "i'll take the long way home",
  "haven't had lunch yet",
];

const REPLIES = [
  "you need something?",
  "give me a minute",
  "oh, hey",
  "there's room, sit down",
  "got a light?",
  "back already?",
];

/** Bench — a park from above at golden hour; tap to feed the birds, plop the pond or chat with the smoker. */
export function BenchSim({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = usePondTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const sizeRef = useRef<{ w: number; h: number } | null>(null);
  const backdropRef = useRef(theme.backdropRgb);

  const lines = useMemo<BenchLines>(
    () => ({
      musings: MUSINGS.map((en, i) => t(`dashboard.pond.sims.bench.musings.${i}`, en)),
      replies: REPLIES.map((en, i) => t(`dashboard.pond.sims.bench.replies.${i}`, en)),
    }),
    [t],
  );
  const linesRef = useRef(lines);

  useEffect(() => {
    linesRef.current = lines;
    if (worldRef.current) worldRef.current.lines = lines;
  }, [lines]);

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
    const overlay = overlayRef.current;
    const size = sizeRef.current;
    if (overlay && size) renderSimOverlay(overlay, size.w, size.h, theme.backdropRgb);
  }, [theme.backdropRgb]);

  useEffect(() => {
    const root = rootRef.current;
    const glCanvas = glRef.current;
    const overlay = overlayRef.current;
    const text = textRef.current;
    if (!root || !glCanvas || !overlay || !text) return;
    let renderer: BenchRenderer | null;
    try {
      renderer = createBenchRenderer(glCanvas);
    } catch {
      renderer = null;
    }
    if (!renderer) return;
    const gl = renderer;
    const ambience = createAmbience(createBenchAmbience());
    let layers: Layers | null = null;
    let visible = false;

    const rebuild = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (!w || !h) return;
      const prev = sizeRef.current;
      if (prev && prev.w === w && prev.h === h && worldRef.current) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const glScale = Math.min(dpr, 1.5);
      const world = createWorld(w, h, dpr, linesRef.current, (nx) => ambience.cue("oar", nx));
      worldRef.current = world;
      layers = createLayers(w, h, dpr);
      sizeRef.current = { w, h };
      const map = buildTerrainMap(world.L);
      gl.setMap(map.data, map.mw, map.mh);
      gl.resize(Math.round(w * glScale), Math.round(h * glScale));
      glCanvas.style.width = `${w}px`;
      glCanvas.style.height = `${h}px`;
      renderSimOverlay(overlay, w, h, backdropRef.current);
      text.width = w * dpr;
      text.height = h * dpr;
      text.style.width = `${w}px`;
      text.style.height = `${h}px`;
    };
    rebuild();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    io.observe(root);
    ambience.attach(root);

    const onPointerDown = (e: PointerEvent) => {
      const world = worldRef.current;
      if (!world) return;
      const rect = root.getBoundingClientRect();
      tapWorld(world, e.clientX - rect.left + world.camX, e.clientY - rect.top + world.camY);
    };
    root.addEventListener("pointerdown", onPointerDown);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(rebuild, 200);
    });
    ro.observe(root);

    let raf = 0;
    let last = 0;
    let due = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - due < FRAME_MS) return;
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      due = now - ((now - due) % FRAME_MS);
      const world = worldRef.current;
      if (!visible || !world || !layers) return;
      stepWorld(world, dt);
      ambience.update({ wind: world.wind });
      renderLayers(world, layers);
      const { L } = world;
      gl.draw(
        {
          w: L.w,
          h: L.h,
          m: L.m,
          time: world.time,
          wind: world.wind,
          camX: world.camX,
          camY: world.camY,
          sunX: 0.78,
          sunY: -0.22,
          ripples: rippleUniforms(world.fx),
          focus: (world.smoker.y - world.camY) / L.h,
        },
        [layers.sprites, layers.shade, layers.air, layers.fore, layers.canopy],
      );
      const ctx = text.getContext("2d");
      if (!ctx) return;
      const k = text.width / L.w;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, text.width, text.height);
      ctx.setTransform(k, 0, 0, k, -world.camX * k, -world.camY * k);
      drawSpeech(ctx, world.fx, L.w);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      ambience.dispose();
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
      gl.dispose();
      worldRef.current = null;
      sizeRef.current = null;
    };
  }, []);

  return (
    <div className={cn("@container mx-auto w-full max-w-[900px]", className)}>
      <div
        ref={rootRef}
        role="img"
        aria-label={t(
          "dashboard.pond.sims.bench.ariaLabel",
          "Central Park from above on a late afternoon: a man smokes on a bench by the pond while people walk the paths, a rowboat crosses the water and families picnic on the lawn.",
        )}
        className="relative aspect-[4/5] w-full cursor-pointer select-none @md:aspect-[16/10]"
        style={{ touchAction: "manipulation" }}
      >
        <canvas ref={glRef} className="absolute inset-0" />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />
        <canvas ref={textRef} className="pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
