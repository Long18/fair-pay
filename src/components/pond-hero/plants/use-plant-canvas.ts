import { useCallback, useEffect, useRef, type RefObject } from "react";
import { buildPlantClusters, type PlantCluster } from "./cluster-config";
import { drawPlantBlade } from "./draw-blade";
import { pondPlantBleed, type PlantBleed } from "./pond-edge";

export function usePlantCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  timeRef: RefObject<number>,
  visibleRef: RefObject<boolean>,
  innerSizeRef: RefObject<{ w: number; h: number } | null>,
  options?: { includeTop?: boolean },
) {
  const includeTop = options?.includeTop ?? false;
  const clustersRef = useRef<PlantCluster[]>([]);
  const bleedRef = useRef<PlantBleed>({
    top: 16,
    right: 96,
    bottom: 96,
    left: 96,
  });
  const rafRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});

  const layout = useCallback(() => {
    const canvas = canvasRef.current;
    const inner = innerSizeRef.current;
    if (!canvas || !inner) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width);
    canvas.height = Math.round(rect.height);
    bleedRef.current = pondPlantBleed(Math.min(inner.w, inner.h), includeTop);
    clustersRef.current = buildPlantClusters(inner.w, inner.h, { includeTop });
  }, [canvasRef, includeTop, innerSizeRef]);

  useEffect(() => {
    layout();
  }, [layout]);

  useEffect(() => {
    layout();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tick = () => {
      if (!visibleRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (clustersRef.current.length === 0 && innerSizeRef.current) layout();
      const t = timeRef.current ?? 0;
      const b = bleedRef.current;
      const innerW = canvas.width - b.left - b.right;
      const innerH = canvas.height - b.top - b.bottom;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(b.left, b.top);
      for (const cluster of clustersRef.current) {
        for (const blade of cluster.blades) {
          drawPlantBlade(ctx, blade, innerW, innerH, t);
        }
      }
      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = tick;
    rafRef.current = requestAnimationFrame(tick);

    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(layout, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [canvasRef, innerSizeRef, layout, timeRef, visibleRef]);

  const resume = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  return { resume, bleedRef };
}
