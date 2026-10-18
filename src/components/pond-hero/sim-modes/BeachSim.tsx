import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { createAmbience } from "../audio/ambience";
import { sfx } from "../audio/sfx";
import { usePondTheme } from "../theme";
import { createBeachAmbienceSpec } from "./beach/ambience";
import { createCrabs, drawCrabs, drawDust, scareCrabs, updateCrabs, type Crab, type Dust } from "./beach/crabs";
import { applyEdgeMask, createEdgeMask, type EdgeMask } from "./beach/edge-mask";
import { createFootprints, drawFootprints, updateFootprints, type FootprintState } from "./beach/footprints";
import { renderSand } from "./beach/sand";
import { createSeaweed, drawSeaweed, type Seaweed } from "./beach/seaweed";
import { createShells, drawShells, hitShell, updateShells, type Shell } from "./beach/shells";
import {
  createWaveCache,
  createWaveState,
  drawWave,
  updateEdgeOffsets,
  updateWave,
  waveAmp,
  wavePose,
  type WaveCache,
  type WaveState,
} from "./beach/wave";

const FRAME_MS = 1e3 / 30;

type Scene = {
  w: number;
  h: number;
  shells: Shell[];
  crabs: Crab[];
  dust: Dust[];
  footprints: FootprintState;
  seaweed: Seaweed[];
  wave: WaveState;
  waveCache: WaveCache;
  edgeMask: EdgeMask | null;
};

/** Beach — waves wash in over the sand; tap shells to crack them and scare the crabs. */
export function BeachSim({ className }: { className?: string }) {
  const theme = usePondTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const sandRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef(theme.backdropRgb);
  const sceneRef = useRef<Scene | null>(null);

  const init = useCallback(() => {
    const root = rootRef.current;
    const sand = sandRef.current;
    const live = liveRef.current;
    if (!root || !sand || !live) return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    renderSand(sand, w, h, backdropRef.current);
    live.width = w;
    live.height = h;
    live.style.width = `${w}px`;
    live.style.height = `${h}px`;
    sceneRef.current = {
      w,
      h,
      shells: createShells(),
      crabs: createCrabs(w, h),
      dust: [],
      footprints: createFootprints(),
      seaweed: createSeaweed(w, h),
      wave: createWaveState(),
      waveCache: createWaveCache(),
      edgeMask: null,
    };
  }, []);

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
    const scene = sceneRef.current;
    const sand = sandRef.current;
    if (scene && sand && scene.w > 0 && scene.h > 0) renderSand(sand, scene.w, scene.h, theme.backdropRgb);
  }, [theme.backdropRgb]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    init();

    let visible = false;
    let raf = 0;
    let last = 0;
    let lastFrame = 0;
    let lastWaveIdx = sceneRef.current?.wave.waveIdx ?? 0;
    const ambience = createAmbience(createBeachAmbienceSpec());
    ambience.attach(root);

    const tick = (now: number) => {
      if (!last) last = now;
      const elapsed = now - lastFrame;
      // `last` advances every rAF, so dt is one display frame even though work runs at 30fps.
      if (elapsed >= FRAME_MS) {
        const dt = Math.min((now - last) / 1e3, 0.05);
        last = now;
        lastFrame = now - (elapsed % FRAME_MS);
        const scene = sceneRef.current;
        const live = liveRef.current;
        const ctx = live?.getContext("2d");
        if (visible && scene && live && ctx) {
          const w = live.width;
          const h = live.height;
          if (w > 0 && h > 0) {
            updateShells(scene.shells, dt);
            updateWave(scene.wave, w, h, dt);
            if (scene.wave.waveIdx !== lastWaveIdx) {
              lastWaveIdx = scene.wave.waveIdx;
              ambience.cue("wave", 0.5, waveAmp(scene.wave));
            }
            updateEdgeOffsets(scene.wave, scene.waveCache, w);
            const pose = wavePose(scene.wave, h);
            updateCrabs(scene.crabs, scene.dust, w, h, dt, pose.y, pose.swashing);
            updateFootprints(scene.footprints, w, h, dt);

            ctx.clearRect(0, 0, w, h);
            drawFootprints(ctx, scene.footprints);
            drawSeaweed(ctx, scene.seaweed, scene.wave.time);
            drawWave(ctx, scene.wave, scene.waveCache, w, h);
            drawShells(ctx, scene.shells, w, h, pose.y);
            drawDust(ctx, scene.dust);
            drawCrabs(ctx, scene.crabs);
            if (!scene.edgeMask || scene.edgeMask.w !== w || scene.edgeMask.h !== h) {
              scene.edgeMask = createEdgeMask(w, h);
            }
            applyEdgeMask(ctx, scene.edgeMask);
          }
        }
      } else {
        last = now;
      }
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) {
          last = 0;
          lastFrame = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(root);

    const onPointerDown = (e: PointerEvent) => {
      const scene = sceneRef.current;
      if (!scene) return;
      const rect = root.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const w = root.clientWidth;
      const h = root.clientHeight;
      const hit = hitShell(scene.shells, px, py, w, h);
      if (hit >= 0 && !scene.shells[hit].cracked) {
        scene.shells[hit].cracked = true;
        sfx.crack(px / w);
      } else {
        sfx.thump(px / w, 0.3);
      }
      if (scareCrabs(scene.crabs, scene.dust, px, py) > 0) ambience.cue("scuttle", px / w);
    };
    root.addEventListener("pointerdown", onPointerDown);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      const scene = sceneRef.current;
      if (scene && scene.w === root.clientWidth && scene.h === root.clientHeight) return;
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(init, 200);
    });
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      ambience.dispose();
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointerdown", onPointerDown);
    };
  }, [init]);

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full cursor-pointer select-none", className)}
      style={{ height: "clamp(370px, 40vh, 480px)", touchAction: "pan-y" }}
    >
      <canvas ref={sandRef} className="absolute inset-0 size-full" aria-hidden />
      <canvas ref={liveRef} className="absolute inset-0" style={{ zIndex: 1 }} aria-hidden />
    </div>
  );
}
