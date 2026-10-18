import { useCallback, useEffect, useRef, type RefObject } from "react";
import { PAPER_FRAMED, renderPaperOverlay } from "./paper";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";
import type { PondTheme } from "../theme";

type Ripple = { x: number; y: number; time: number; amp: number };

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader error:", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

export function useWaveGL(
  waterRef: RefObject<HTMLCanvasElement | null>,
  paperRef: RefObject<HTMLCanvasElement | null>,
  visibleRef: RefObject<boolean>,
  theme: PondTheme,
) {
  const rafRef = useRef(0);
  const clockStartRef = useRef(0);
  const timeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const tickRef = useRef<() => void>(() => {});

  const pushRipple = useCallback((x: number, y: number, amp = 1) => {
    const now = (performance.now() - clockStartRef.current) / 1000;
    const kept: Ripple[] = [];
    for (const r of ripplesRef.current) {
      if (now - r.time < 4) kept.push(r);
    }
    if (kept.length >= 12) kept.shift();
    kept.push({ x, y, time: now, amp });
    ripplesRef.current = kept;
  }, []);

  const triggerRippleAt = useCallback(
    (nx: number, ny: number, amp = 1) => {
      const canvas = waterRef.current;
      if (!canvas) return;
      pushRipple(nx * canvas.width, ny * canvas.height, amp);
    },
    [pushRipple, waterRef],
  );

  useEffect(() => {
    const water = waterRef.current;
    const paper = paperRef.current;
    if (!water || !paper) return;

    resizeCanvasToDisplaySize(water);
    const paperRect = water.getBoundingClientRect();
    paper.width = Math.round(paperRect.width);
    paper.height = Math.round(paperRect.height);

    const gl = water.getContext("webgl", {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) return;
    gl.clearColor(0, 0, 0, 0);

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uRipples = Array.from({ length: 12 }, (_, i) =>
      gl.getUniformLocation(program, `u_ripples[${i}]`),
    );
    const uDeep = gl.getUniformLocation(program, "u_water_deep");
    const uMid = gl.getUniformLocation(program, "u_water_mid");
    const uSky = gl.getUniformLocation(program, "u_water_sky");

    gl.uniform2f(uRes, water.width, water.height);
    gl.uniform3f(uDeep, ...theme.waterDeep);
    gl.uniform3f(uMid, ...theme.waterMid);
    gl.uniform3f(uSky, ...theme.waterSky);
    clockStartRef.current = performance.now();
    for (let i = 0; i < 12; i++) {
      gl.uniform4f(uRipples[i], 0, 0, -10, 0);
    }

    const matte = theme.backdropRgb;
    renderPaperOverlay(paper, matte, PAPER_FRAMED);

    const tick = () => {
      if (!visibleRef.current) {
        if (pausedAtRef.current === 0) pausedAtRef.current = performance.now();
        return;
      }
      if (pausedAtRef.current > 0) {
        clockStartRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = 0;
      }

      const t = (performance.now() - clockStartRef.current) / 1000;
      timeRef.current = t;
      gl.uniform1f(uTime, t);

      const ripples = ripplesRef.current;
      for (let i = 0; i < 12; i++) {
        const u = uRipples[i];
        if (!u) continue;
        if (i < ripples.length) {
          const r = ripples[i];
          gl.uniform4f(u, r.x, r.y, r.time, r.amp);
        } else {
          gl.uniform4f(u, 0, 0, -10, 0);
        }
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;
    rafRef.current = requestAnimationFrame(tick);

    let resizeTimer = 0;
    const onResize = () => {
      resizeCanvasToDisplaySize(water);
      gl.viewport(0, 0, water.width, water.height);
      gl.uniform2f(uRes, water.width, water.height);
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const rect = water.getBoundingClientRect();
        paper.width = Math.round(rect.width);
        paper.height = Math.round(rect.height);
        renderPaperOverlay(paper, matte, PAPER_FRAMED);
      }, 150);
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [paperRef, theme, visibleRef, waterRef]);

  const resume = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, []);

  return { timeRef, triggerRippleAt, resume };
}
