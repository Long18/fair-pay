import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { sfx } from "../audio/sfx";
import { usePondTheme } from "../theme";
import { SoccerDuckSvg } from "./soccer/DuckSvg";
import { createGame, grabNearestDuck, handleTap, stepGame, type Game, type Team } from "./soccer/game";
import { createParticleState, ensureAmbient, spawnDust, tickParticles } from "./soccer/particles";
import { drawBall, paintPitch } from "./soccer/render";

type FlashPhase = 0 | 1 | 2 | 3;

const DUCK_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];
const DUCK_FILTER = "blur(0.45px) drop-shadow(0 0 3px rgba(42,37,32,0.08))";
const DUCK_FILTER_ACTIVE =
  "drop-shadow(0 0 5px rgba(255,220,140,0.55)) drop-shadow(0 1px 2px rgba(42,37,32,0.18))";

function GoalOverlay({
  flashPhase,
  goalTeam,
  score,
}: {
  flashPhase: FlashPhase;
  goalTeam: Team;
  score: [number, number];
}) {
  const { t } = useTranslation();
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{ transition: "opacity 0.3s ease-out", opacity: flashPhase === 3 ? 0 : 1 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(255,255,255,${flashPhase === 1 ? 0.25 : 0}) 0%, transparent 70%)`,
          transition: "all 0.3s ease-out",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            goalTeam === 0
              ? "linear-gradient(to left, rgba(255,240,200,0.12) 0%, rgba(255,248,230,0.04) 40%, transparent 70%)"
              : "linear-gradient(to right, rgba(255,240,200,0.12) 0%, rgba(255,248,230,0.04) 40%, transparent 70%)",
          opacity: flashPhase >= 2 ? 1 : 0,
          transition: "opacity 0.4s ease-in",
        }}
      />
      {flashPhase >= 2 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex flex-col items-center gap-1"
            style={{ animation: "soccerGoalPulse 1.2s ease-out forwards" }}
          >
            <span
              className="font-mono text-sm tracking-[0.35em] text-white/50"
              style={{
                textShadow: "0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05)",
              }}
            >
              {t("dashboard.pond.sims.soccer.goal", "GOAL")}
            </span>
            <span className="mt-0.5 text-[9px] tracking-widest text-white/25">
              {goalTeam === 0 ? score[0] : score[1]} - {goalTeam === 0 ? score[1] : score[0]}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Soccer — white ducks vs mallards; hover to steer a white duck, tap to kick. */
export function SoccerSim({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = usePondTheme();
  const boxRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLCanvasElement>(null);
  const partRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef<HTMLCanvasElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const duckEls = useRef<(HTMLDivElement | null)[]>([]);
  const gameRef = useRef<Game | null>(null);
  const backdropRef = useRef(theme.backdropRgb);
  const scoreRef = useRef<[number, number]>([0, 0]);
  const flashRef = useRef(0);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [showFlash, setShowFlash] = useState(false);
  const [goalTeam, setGoalTeam] = useState<Team>(0);
  const [flashPhase, setFlashPhase] = useState<FlashPhase>(0);

  useEffect(() => {
    backdropRef.current = theme.backdropRgb;
    const box = boxRef.current;
    const canvas = fieldRef.current;
    if (!gameRef.current || !box || !canvas) return;
    paintPitch(canvas, box.clientWidth, box.clientHeight, theme.backdropRgb);
  }, [theme.backdropRgb]);

  useEffect(() => {
    const box = boxRef.current;
    const field = fieldRef.current;
    const partCanvas = partRef.current;
    if (!box || !field || !partCanvas) return;
    const parts = createParticleState();
    const timers = new Set<number>();
    let builtW = 0;
    let builtH = 0;

    const build = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (w <= 0 || h <= 0 || (w === builtW && h === builtH)) return;
      builtW = w;
      builtH = h;
      paintPitch(field, w, h, backdropRef.current);
      partCanvas.width = w;
      partCanvas.height = h;
      partCanvas.style.width = `${w}px`;
      partCanvas.style.height = `${h}px`;
      gameRef.current = createGame(w, h);
      ensureAmbient(parts, w, h);
    };

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const onGoal = (team: Team) => {
      flashRef.current = 1;
      sfx.cheer();
      setShowFlash(true);
      setGoalTeam(team);
      setFlashPhase(1);
      later(() => setFlashPhase(2), 200);
      later(() => setFlashPhase(3), 1200);
      later(() => {
        flashRef.current = 0;
        setShowFlash(false);
        setFlashPhase(0);
      }, 2000);
    };

    let last = 0;
    let rollX = 0;
    let rollY = 0;
    const frame = (now: number) => {
      if (!last) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const game = gameRef.current;
      if (!game) return;
      stepGame(game, dt);

      const time = game.time;
      const celebrating = game.goalFlash > 0;
      const controlled = game.cursor.active ? game.userControlled : -1;
      for (let i = 0; i < game.ducks.length; i++) {
        const duck = game.ducks[i];
        const el = duckEls.current[i];
        if (!el) continue;
        if (celebrating && duck.team === game.goalTeam) {
          const hop = 10 * Math.abs(Math.sin(12 * time + 2 * duck.phase)) + 2;
          const wobble = 8 * Math.sin(16 * time + duck.phase);
          const scale = 1 + 0.08 * Math.sin(12 * time + 2 * duck.phase);
          el.style.left = `${duck.x}px`;
          el.style.top = `${duck.y - hop}px`;
          el.style.transform = `translate(-50%,-50%) rotate(${wobble}deg) scale(${scale})`;
        } else {
          const deg = (180 * duck.heading) / Math.PI + 90;
          el.style.left = `${duck.x}px`;
          el.style.top = `${duck.y + 1.5 * Math.sin(14 * time + duck.phase)}px`;
          el.style.transform = `translate(-50%,-50%) rotate(${deg + 3 * Math.sin(7 * time + duck.phase)}deg)`;
        }
        el.style.filter = i === controlled ? DUCK_FILTER_ACTIVE : DUCK_FILTER;
        if (duck.step > 2) {
          duck.step -= 2;
          spawnDust(parts, duck.x, duck.y, duck.heading);
        }
      }

      const arrow = arrowRef.current;
      if (arrow) {
        if (controlled >= 0) {
          const duck = game.ducks[controlled];
          arrow.style.left = `${duck.x}px`;
          arrow.style.top = `${duck.y - 24 + 1.5 * Math.sin(6 * time)}px`;
          arrow.style.transform = "translate(-50%, -50%)";
          arrow.style.display = "block";
        } else {
          arrow.style.display = "none";
        }
      }

      rollX += game.ball.vx * dt * 0.25;
      rollY += game.ball.vy * dt * 0.25;
      const z = game.ball.z;
      const ballCanvas = ballRef.current;
      if (ballCanvas) {
        const ctx = ballCanvas.getContext("2d");
        if (ctx) drawBall(ctx, rollX, rollY);
        const holder = ballCanvas.parentElement;
        if (holder) {
          holder.style.left = `${game.ball.x}px`;
          holder.style.top = `${game.ball.y - 0.6 * z}px`;
          holder.style.transform = `translate(-50%,-50%) scale(${1 + 0.014 * z})`;
          holder.style.zIndex = z > 2 ? "5" : "3";
        }
      }
      const shadow = shadowRef.current;
      if (shadow) {
        shadow.style.left = `${game.ball.x}px`;
        shadow.style.top = `${game.ball.y}px`;
        shadow.style.transform = `translate(-50%,-50%) scale(${Math.max(0.3, 1 - 0.008 * z)})`;
        shadow.style.opacity = `${Math.max(0.05, 0.25 - 0.003 * z)}`;
        shadow.style.display = z > 1 ? "block" : "none";
      }

      if (game.score[0] !== scoreRef.current[0] || game.score[1] !== scoreRef.current[1]) {
        scoreRef.current = [game.score[0], game.score[1]];
        setScore([game.score[0], game.score[1]]);
      }
      if (game.goalFlash > 0 && flashRef.current <= 0) onGoal(game.goalTeam);

      const pctx = partCanvas.getContext("2d");
      if (pctx) tickParticles(pctx, parts, partCanvas.width, partCanvas.height, dt);
    };

    let raf = 0;
    let running = false;
    let visible = false;
    const tick = (now: number) => {
      if (!visible) {
        running = false;
        return;
      }
      frame(now);
      raf = requestAnimationFrame(tick);
    };

    build();

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !running) {
          running = true;
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.15 },
    );
    io.observe(box);

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 200);
    });
    ro.observe(box);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      for (const id of timers) clearTimeout(id);
      timers.clear();
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  const localPoint = (clientX: number, clientY: number) => {
    const box = boxRef.current;
    if (!box || !gameRef.current) return null;
    const rect = box.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, rect, game: gameRef.current };
  };

  const tap = (clientX: number, clientY: number) => {
    const p = localPoint(clientX, clientY);
    if (!p) return;
    handleTap(p.game, p.x, p.y);
    sfx.kick(p.game.ball.x / p.rect.width);
  };

  const enter = (clientX: number, clientY: number) => {
    const p = localPoint(clientX, clientY);
    if (p) grabNearestDuck(p.game, p.x, p.y);
  };

  const move = (clientX: number, clientY: number) => {
    const p = localPoint(clientX, clientY);
    if (!p) return;
    p.game.cursor.x = p.x;
    p.game.cursor.y = p.y;
    p.game.cursor.active = true;
  };

  const leave = () => {
    const game = gameRef.current;
    if (!game) return;
    game.cursor.active = false;
    game.userControlled = -1;
  };

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full max-w-[900px] cursor-pointer overflow-hidden", className)}
      style={{
        aspectRatio: "900 / 340",
        minHeight: 260,
        maxHeight: 340,
        touchAction: "pan-y",
        borderRadius: "8px",
      }}
      onClick={(e) => tap(e.clientX, e.clientY)}
      onMouseEnter={(e) => enter(e.clientX, e.clientY)}
      onMouseMove={(e) => move(e.clientX, e.clientY)}
      onMouseLeave={leave}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        enter(touch.clientX, touch.clientY);
        tap(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (touch) move(touch.clientX, touch.clientY);
      }}
      onTouchEnd={leave}
      onTouchCancel={leave}
    >
      <canvas ref={fieldRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <canvas
        ref={partRef}
        className="absolute inset-0"
        style={{ zIndex: 1, pointerEvents: "none" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 select-none">
        <span className="text-xs tracking-wide text-white/50 tabular-nums">{score[0]}</span>
        <span className="text-[10px] tracking-widest text-white/25">
          {t("dashboard.pond.sims.soccer.vs", "vs")}
        </span>
        <span className="text-xs tracking-wide text-white/50 tabular-nums">{score[1]}</span>
      </div>
      {showFlash ? <GoalOverlay flashPhase={flashPhase} goalTeam={goalTeam} score={score} /> : null}
      <div
        ref={shadowRef}
        className="pointer-events-none absolute"
        style={{
          zIndex: 2,
          width: 14,
          height: 7,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.18)",
          display: "none",
        }}
      />
      <div
        ref={arrowRef}
        className="pointer-events-none absolute"
        style={{ zIndex: 4, display: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
      >
        <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden>
          <path
            d="M1.2 1 L4.5 4.7 L7.8 1"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute"
        style={{ zIndex: 3, willChange: "transform", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.12))" }}
      >
        <canvas ref={ballRef} width={22} height={22} style={{ width: 22, height: 22 }} aria-hidden />
      </div>
      {DUCK_INDICES.map((i) => (
        <div
          key={i}
          ref={(el) => {
            duckEls.current[i] = el;
          }}
          className="pointer-events-none absolute"
          style={{ zIndex: 2, willChange: "transform", filter: DUCK_FILTER }}
        >
          <svg width={48} height={48} viewBox="0 0 48 48" fill="none" aria-hidden>
            <SoccerDuckSvg paddling={false} mallard={i >= 4} />
          </svg>
        </div>
      ))}
      <style>
        {
          "@keyframes soccerGoalPulse { 0% { opacity: 0; transform: scale(0.8) translateY(4px); } 15% { opacity: 1; transform: scale(1.05) translateY(0); } 30% { transform: scale(1) translateY(0); } 100% { opacity: 0.6; transform: scale(1) translateY(0); } }"
        }
      </style>
    </div>
  );
}
