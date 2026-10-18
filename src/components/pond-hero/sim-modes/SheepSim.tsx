import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePondTheme } from "../theme";
import { createSheepScene, type SpeechLines } from "./sheep/render";
import { createFlock, stepFlock, type Flock } from "./sheep/simulation";

const FRAME_MS = 1e3 / 30;

/** Sheep — a flock hops a wooden fence; press to send the next one in. */
export function SheepSim({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = usePondTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flockRef = useRef<Flock | null>(null);
  const backdropRef = useRef(theme.backdropRgb);
  const visibleRef = useRef(true);
  const rafRef = useRef(0);

  const lines = useMemo<SpeechLines>(
    () => ({
      stuck: [
        t("dashboard.pond.sims.sheep.stuck1", "baa!"),
        t("dashboard.pond.sims.sheep.stuck2", "help!"),
        t("dashboard.pond.sims.sheep.stuck3", "ugh..."),
        t("dashboard.pond.sims.sheep.stuck4", "oh no"),
        t("dashboard.pond.sims.sheep.stuck5", "why me"),
      ],
      struggle: [
        t("dashboard.pond.sims.sheep.struggle1", "baaaa!!"),
        t("dashboard.pond.sims.sheep.struggle2", "ngh!"),
        t("dashboard.pond.sims.sheep.struggle3", "almost..!"),
        t("dashboard.pond.sims.sheep.struggle4", "c'mon!"),
        t("dashboard.pond.sims.sheep.struggle5", "one more..!"),
      ],
      thoughts: [
        t("dashboard.pond.sims.sheep.thought1", "is this what grass feels like from above"),
        t("dashboard.pond.sims.sheep.thought2", "i had a dream about this fence"),
        t("dashboard.pond.sims.sheep.thought3", "the wool weighs more than it used to"),
        t("dashboard.pond.sims.sheep.thought4", "maybe the fence is the point"),
        t("dashboard.pond.sims.sheep.thought5", "i used to clear this easily"),
        t("dashboard.pond.sims.sheep.thought6", "do the clouds ever get stuck"),
        t("dashboard.pond.sims.sheep.thought7", "this is a metaphor isn't it"),
        t("dashboard.pond.sims.sheep.thought8", "the other sheep make it look easy"),
      ],
    }),
    [t],
  );
  const linesRef = useRef(lines);

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
  }, [theme.backdropRgb]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  const reset = useCallback(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    flockRef.current = createFlock(w, h);
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    reset();
    const scene = createSheepScene(
      () => backdropRef.current,
      () => linesRef.current,
    );

    let lastStep = 0;
    let lastFrame = 0;
    const tick = (now: number) => {
      if (!visibleRef.current) return;
      if (!lastStep) lastStep = now;
      const elapsed = now - lastFrame;
      if (elapsed >= FRAME_MS) {
        const dt = Math.min((now - lastStep) / 1e3, 0.05);
        lastStep = now;
        lastFrame = now - (elapsed % FRAME_MS);
        const canvas = canvasRef.current;
        const flock = flockRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && flock && ctx && canvas.width > 0 && canvas.height > 0) {
          stepFlock(flock, canvas.width, canvas.height, dt);
          scene.render(ctx, flock, canvas.width, canvas.height, dt);
        }
      } else {
        // dt spans only the last display frame, not the whole 30fps step — this sets the
        // original's leisurely pace, so keep it.
        lastStep = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        const wasHidden = !visibleRef.current;
        visibleRef.current = entry.isIntersecting;
        if (wasHidden && entry.isIntersecting) {
          lastStep = 0;
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(box);

    const sendNext = () => {
      if (flockRef.current) flockRef.current.spawnTimer = 0;
    };
    box.addEventListener("mousedown", sendNext);
    box.addEventListener("touchstart", sendNext, { passive: true });

    let resizeTimer = 0;
    let size = { w: box.clientWidth, h: box.clientHeight };
    const ro = new ResizeObserver(() => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w === size.w && h === size.h) return;
      size = { w, h };
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(reset, 200);
    });
    ro.observe(box);

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      io.disconnect();
      ro.disconnect();
      box.removeEventListener("mousedown", sendNext);
      box.removeEventListener("touchstart", sendNext);
    };
  }, [reset]);

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full cursor-pointer select-none", className)}
      style={{ height: "clamp(370px, 40vh, 480px)", touchAction: "pan-y" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
    </div>
  );
}
