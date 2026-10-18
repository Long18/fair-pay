import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { randomDuckLine, randomFishLine } from "./quotes";
import { pondSound } from "./sound";
import {
  createPondState,
  dropFood,
  spawnDuck,
  spawnFish,
  stepPondSimulation,
  type PondSceneState,
} from "./simulation/pond-engine";

export type RenderEntity = {
  id: number;
  kind: "duck" | "fish" | "person";
  nx: number;
  ny: number;
  offsetY: number;
  rotation: number;
  scale: number;
  opacity: number;
  paddling: boolean;
  mallard: boolean;
  burst: boolean;
  personColor: "pink" | "yellow" | "green" | "blue";
};

export function usePondScene({
  containerRef,
  timeRef,
  visibleRef,
  onRipple,
  feedMode: feedModeProp,
  onFeedModeChange,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  timeRef: RefObject<number>;
  visibleRef: RefObject<boolean>;
  onRipple: (nx: number, ny: number, amp?: number) => void;
  feedMode?: boolean;
  onFeedModeChange?: (next: boolean) => void;
}) {
  const stateRef = useRef<PondSceneState>(createPondState());
  const aspectRef = useRef(1.5);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});
  const onRippleRef = useRef(onRipple);
  const [feedModeInternal, setFeedModeInternal] = useState(false);
  const feedMode = feedModeProp ?? feedModeInternal;
  const [renderEntities, setRenderEntities] = useState<RenderEntity[]>([]);
  const [foodVisuals, setFoodVisuals] = useState<
    PondSceneState["foodVisuals"]
  >([]);
  const [speech, setSpeech] = useState<{ text: string; entityIndex: number } | null>(null);
  const lastLineRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    onRippleRef.current = onRipple;
  }, [onRipple]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        aspectRef.current = el.offsetWidth / el.offsetHeight;
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const tick = () => {
      if (visibleRef.current) {
        const t = timeRef.current ?? 0;
        const dt = lastTimeRef.current > 0 ? Math.min(t - lastTimeRef.current, 0.05) : 0.016;
        lastTimeRef.current = t;
        stepPondSimulation(
          stateRef.current,
          t,
          dt,
          aspectRef.current,
          (nx, ny, amp) => onRippleRef.current(nx, ny, amp),
        );
        const ents = stateRef.current.entities.map((e) => ({
          id: e.id,
          kind:
            e.variant.kind === "fish"
              ? ("fish" as const)
              : e.variant.kind === "person"
                ? ("person" as const)
                : ("duck" as const),
          nx: e.nx,
          ny: e.ny,
          offsetY: e.offsetY,
          rotation: e.rotation,
          scale: e.scale,
          opacity: e.opacity,
          paddling:
            e.action === "paddle" ||
            e.action === "leaving" ||
            (e.variant.kind === "person" && e.action === "float"),
          mallard: e.variant.kind === "duck" ? e.variant.mallard : false,
          burst: e.variant.kind === "fish" && e.paddleIntensity > 0.5,
          personColor:
            e.variant.kind === "person"
              ? e.variant.color
              : "blue",
        }));
        setRenderEntities(ents);
        setFoodVisuals([...stateRef.current.foodVisuals]);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tickRef.current = tick;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [timeRef, visibleRef]);

  const seedInitial = useCallback(() => {
    const t = timeRef.current ?? 0;
    spawnDuck(stateRef.current, 0.38, 0.42, t);
    spawnDuck(stateRef.current, 0.58, 0.55, t);
    spawnFish(stateRef.current, 0.45, 0.48, t);
    onRippleRef.current(0.4, 0.45, 0.6);
    onRippleRef.current(0.58, 0.52, 0.5);
  }, [timeRef]);

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const box = containerRef.current?.getBoundingClientRect();
      if (!box) return;
      const nx = (clientX - box.left) / box.width;
      const ny = (clientY - box.top) / box.height;
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
      const time = timeRef.current ?? 0;

      if (feedMode) {
        dropFood(stateRef.current, nx, ny, time, (a, b, c) => onRippleRef.current(a, b, c));
        return;
      }
      spawnDuck(stateRef.current, nx, ny, time);
      onRippleRef.current(nx, ny, 1);
      pondSound.plop(nx);
    },
    [containerRef, feedMode, timeRef],
  );

  const onEntityClick = useCallback(
    (entityId: number, nx: number) => {
      pondSound.chirp(nx);
      const ent = stateRef.current.entities.find((e) => e.id === entityId);
      const line =
        ent?.variant.kind === "fish"
          ? randomFishLine()
          : randomDuckLine(lastLineRef.current);
      lastLineRef.current = line;
      const index = stateRef.current.entities.findIndex((e) => e.id === entityId);
      setSpeech({ text: line, entityIndex: Math.max(0, index) });
      window.setTimeout(() => setSpeech(null), 3500 + Math.random() * 1500);
    },
    [],
  );

  const resume = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  return {
    renderEntities,
    foodVisuals,
    feedMode,
    toggleFeedMode: () => {
      const next = !feedMode;
      if (onFeedModeChange) onFeedModeChange(next);
      else setFeedModeInternal(next);
    },
    handleTap,
    onEntityClick,
    seedInitial,
    resume,
    speech,
  };
}
