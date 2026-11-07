import { useRef, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { FP_LOADER_LOGO } from "./fairpay-loader-logo.tokens";

/**
 * MindMarket-style preloader choreography on the **real** FairPay favicon mark
 * (not a substitute SVG). Decorative ring only — brand asset stays `favicon.ico`.
 */
export function useFairPayLoaderLogoTimeline(
  scopeRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  const loopRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const root = scopeRef.current;
      if (!root || !enabled) return;

      const svgWrap = root.querySelector<HTMLElement>("[data-fp-loader-wrap]");
      const mark = root.querySelector<HTMLElement>("[data-fp-brand-mark]");
      const ring = root.querySelector<SVGCircleElement>("[data-fp-brand-ring]");

      if (ring) {
        const r = Number(ring.getAttribute("r") ?? 48);
        const len = 2 * Math.PI * r;
        ring.style.strokeDasharray = `${len}`;
        ring.style.strokeDashoffset = `${len}`;
      }

      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      if (svgWrap) {
        tl.fromTo(
          svgWrap,
          { yPercent: FP_LOADER_LOGO.stageEnterYPercent, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: FP_LOADER_LOGO.stageEnterDuration,
          },
          0,
        );
      }

      if (ring) {
        const r = Number(ring.getAttribute("r") ?? 48);
        const len = 2 * Math.PI * r;
        tl.to(
          ring,
          {
            strokeDashoffset: 0,
            opacity: 1,
            duration: FP_LOADER_LOGO.strokeDrawDuration,
          },
          0.08,
        );
      }

      if (mark) {
        gsap.set(mark, {
          opacity: 0,
          scale: 0.55,
          filter: "blur(8px)",
          transformOrigin: "50% 50%",
        });
        tl.to(
          mark,
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: FP_LOADER_LOGO.fillFadeDuration,
            ease: "back.out(1.4)",
          },
          FP_LOADER_LOGO.fillDelay,
        );
      }

      const idle = gsap.timeline({ repeat: -1, yoyo: true });
      const floatTarget = svgWrap ?? mark;
      if (floatTarget) {
        idle.to(floatTarget, {
          y: -FP_LOADER_LOGO.idleFloatYPx,
          duration: FP_LOADER_LOGO.idlePulseDuration,
          ease: "sine.inOut",
        });
      }
      if (mark) {
        idle.to(
          mark,
          {
            scale: 1.04,
            duration: FP_LOADER_LOGO.idlePulseDuration,
            ease: "sine.inOut",
          },
          0,
        );
      }

      tl.add(idle, ">");
      loopRef.current = tl;

      return () => {
        loopRef.current?.kill();
        loopRef.current = null;
      };
    },
    { scope: scopeRef, dependencies: [enabled] },
  );
}
