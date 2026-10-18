import { seededRandom, type Ctx2D } from "./util";

type ShellType = {
  color: string;
  accent: string;
  draw: (ctx: Ctx2D, t: number) => void;
  /** `a` is crack progress 0–1; halves drift apart as it grows. */
  drawCracked: (ctx: Ctx2D, t: number, a: number) => void;
};

export type Shell = {
  /** Normalized position (0–1) within the scene. */
  x: number;
  y: number;
  size: number;
  rotation: number;
  type: number;
  cracked: boolean;
  crackT: number;
  opacity: number;
};

const PI = Math.PI;

function halves(
  ctx: Ctx2D,
  color: string,
  accent: string,
  left: { tx: number; ty: number; rot: number; path: () => void },
  right: { tx: number; ty: number; rot: number; path: () => void },
) {
  ctx.save();
  ctx.translate(left.tx, left.ty);
  if (left.rot) ctx.rotate(left.rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  left.path();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(right.tx, right.ty);
  if (right.rot) ctx.rotate(right.rot);
  ctx.fillStyle = accent;
  ctx.beginPath();
  right.path();
  ctx.fill();
  ctx.restore();
}

function shell(
  color: string,
  accent: string,
  draw: (ctx: Ctx2D, t: number, color: string, accent: string) => void,
  drawCracked: (ctx: Ctx2D, t: number, a: number, color: string, accent: string) => void,
): ShellType {
  return {
    color,
    accent,
    draw: (ctx, t) => draw(ctx, t, color, accent),
    drawCracked: (ctx, t, a) => drawCracked(ctx, t, a, color, accent),
  };
}

export const SHELL_TYPES: ShellType[] = [
  // Scallop fan
  shell(
    "#D4B896",
    "#C0A47C",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(0, 0.4 * t);
      e.quadraticCurveTo(-(0.48 * t), -(0.1 * t), -(0.18 * t), -(0.42 * t));
      e.quadraticCurveTo(0, -(0.52 * t), 0.18 * t, -(0.42 * t));
      e.quadraticCurveTo(0.48 * t, -(0.1 * t), 0, 0.4 * t);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.6;
      for (let a = -3; a <= 3; a++) {
        e.beginPath();
        e.moveTo(0, 0.35 * t);
        e.quadraticCurveTo(a * t * 0.08, -(0.05 * t), a * t * 0.06, -(0.38 * t));
        e.stroke();
      }
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.3;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 0,
          rot: -(0.2 * a),
          path: () => {
            e.moveTo(0, 0.4 * t);
            e.quadraticCurveTo(-(0.48 * t), -(0.1 * t), -(0.18 * t), -(0.42 * t));
            e.lineTo(0, -(0.2 * t));
            e.closePath();
          },
        },
        {
          tx: l,
          ty: 0,
          rot: 0.2 * a,
          path: () => {
            e.moveTo(0, 0.4 * t);
            e.quadraticCurveTo(0.48 * t, -(0.1 * t), 0.18 * t, -(0.42 * t));
            e.lineTo(0, -(0.2 * t));
            e.closePath();
          },
        },
      );
    },
  ),
  // Moon snail spiral
  shell(
    "#E0C8A8",
    "#C8B090",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.ellipse(0, 0, 0.38 * t, 0.28 * t, 0, 0, 2 * PI);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.7;
      e.beginPath();
      for (let a = 0; a < 3.5 * PI; a += 0.08) {
        const l = 0.04 * t + a * t * 0.028;
        const x = Math.cos(a) * l * 0.65;
        const y = Math.sin(a) * l * 0.42;
        if (a < 0.1) e.moveTo(x, y);
        else e.lineTo(x, y);
      }
      e.stroke();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.25;
      halves(
        e,
        color,
        accent,
        { tx: -l, ty: -(0.3 * l), rot: -(0.15 * a), path: () => e.ellipse(0, 0, 0.38 * t, 0.28 * t, 0, 0.5 * PI, 1.5 * PI) },
        { tx: l, ty: 0.3 * l, rot: 0.1 * a, path: () => e.ellipse(0, 0, 0.38 * t, 0.28 * t, 0, -(0.5 * PI), 0.5 * PI) },
      );
    },
  ),
  // Ringed clam
  shell(
    "#C8B898",
    "#B0A080",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.ellipse(0, 0, 0.35 * t, 0.25 * t, 0, 0, 2 * PI);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.5;
      e.beginPath();
      e.ellipse(0, 0.03 * t, 0.25 * t, 0.17 * t, 0, 0, 2 * PI);
      e.stroke();
      e.beginPath();
      e.ellipse(0, 0.06 * t, 0.15 * t, 0.1 * t, 0, 0, 2 * PI);
      e.stroke();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        { tx: -l, ty: 2 * a, rot: 0, path: () => e.ellipse(0, 0, 0.2 * t, 0.23 * t, -0.15, 0, 2 * PI) },
        { tx: l, ty: -(1.5 * a), rot: 0.3 * a, path: () => e.ellipse(0, 0, 0.18 * t, 0.2 * t, 0.15, 0, 2 * PI) },
      );
    },
  ),
  // Cowrie
  shell(
    "#E8D8C0",
    "#D0C0A8",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.ellipse(0, 0, 0.22 * t, 0.32 * t, 0, 0, 2 * PI);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.9;
      e.beginPath();
      e.moveTo(0, -(0.24 * t));
      e.lineTo(0, 0.24 * t);
      e.stroke();
      e.lineWidth = 0.4;
      for (let a = -3; a <= 3; a++) {
        const l = a * t * 0.06;
        e.beginPath();
        e.moveTo(-(0.04 * t), l);
        e.lineTo(0.04 * t, l);
        e.stroke();
      }
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        { tx: -l, ty: 0, rot: -(0.2 * a), path: () => e.ellipse(0, 0, 0.13 * t, 0.3 * t, -0.1, 0, 2 * PI) },
        { tx: l, ty: 0, rot: 0.15 * a, path: () => e.ellipse(0, 0, 0.11 * t, 0.24 * t, 0.1, 0, 2 * PI) },
      );
    },
  ),
  // Whelk curl
  shell(
    "#DCC0A0",
    "#C4A880",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(-(0.15 * t), 0.35 * t);
      e.quadraticCurveTo(-(0.4 * t), 0.1 * t, -(0.28 * t), -(0.15 * t));
      e.quadraticCurveTo(-(0.1 * t), -(0.45 * t), 0.1 * t, -(0.38 * t));
      e.quadraticCurveTo(0.35 * t, -(0.2 * t), 0.2 * t, 0.15 * t);
      e.quadraticCurveTo(0.05 * t, 0.4 * t, -(0.15 * t), 0.35 * t);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.5;
      e.beginPath();
      e.arc(0, 0, 0.15 * t, 0.3 * PI, 1.5 * PI);
      e.stroke();
      e.beginPath();
      e.arc(0, -(0.05 * t), 0.08 * t, 0.2 * PI, 1.4 * PI);
      e.stroke();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.25;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 0.2 * l,
          rot: -(0.15 * a),
          path: () => e.ellipse(-(0.05 * t), 0, 0.18 * t, 0.3 * t, -0.2, 0.5 * PI, 1.5 * PI),
        },
        {
          tx: l,
          ty: -(0.15 * l),
          rot: 0.2 * a,
          path: () => e.ellipse(0.05 * t, 0, 0.15 * t, 0.25 * t, 0.1, -(0.5 * PI), 0.5 * PI),
        },
      );
    },
  ),
  // Limpet
  shell(
    "#C0B498",
    "#A89C80",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.ellipse(0, 0.05 * t, 0.28 * t, 0.2 * t, 0, 0, 2 * PI);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.4;
      for (let a = 0; a < 2 * PI; a += PI / 5) {
        e.beginPath();
        e.moveTo(Math.cos(a) * t * 0.06, 0.05 * t + Math.sin(a) * t * 0.04);
        e.lineTo(Math.cos(a) * t * 0.25, 0.05 * t + Math.sin(a) * t * 0.18);
        e.stroke();
      }
      e.fillStyle = "rgba(255,255,255,0.12)";
      e.beginPath();
      e.arc(0, 0.02 * t, 0.07 * t, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        { tx: -l, ty: a, rot: -(0.25 * a), path: () => e.ellipse(0, 0, 0.16 * t, 0.18 * t, -0.1, 0, 2 * PI) },
        { tx: l, ty: -(0.5 * a), rot: 0.2 * a, path: () => e.ellipse(0, 0, 0.14 * t, 0.15 * t, 0.1, 0, 2 * PI) },
      );
    },
  ),
  // Starfish
  shell(
    "#D4A07A",
    "#C08860",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      for (let a = 0; a < 5; a++) {
        const l = (a / 5) * PI * 2 - PI / 2;
        const r = l + PI / 5;
        const ox = Math.cos(l) * t * 0.4;
        const oy = Math.sin(l) * t * 0.4;
        if (a === 0) e.moveTo(ox, oy);
        else e.lineTo(ox, oy);
        e.lineTo(Math.cos(r) * t * 0.14, Math.sin(r) * t * 0.14);
      }
      e.closePath();
      e.fill();
      e.fillStyle = accent;
      e.beginPath();
      e.arc(0, 0, 0.08 * t, 0, 2 * PI);
      e.fill();
      e.fillStyle = "rgba(255,255,255,0.15)";
      for (let a = 0; a < 5; a++) {
        const l = (a / 5) * PI * 2 - PI / 2;
        e.beginPath();
        e.arc(Math.cos(l) * t * 0.22, Math.sin(l) * t * 0.22, 0.03 * t, 0, 2 * PI);
        e.fill();
      }
    },
    (e, t, a, color, accent) => {
      halves(
        e,
        color,
        accent,
        {
          tx: a * t * 0.3,
          ty: -a * t * 0.2,
          rot: 0.5 * a,
          path: () => {
            e.moveTo(0, -(0.38 * t));
            e.lineTo(-(0.08 * t), -(0.08 * t));
            e.lineTo(0.08 * t, -(0.08 * t));
            e.closePath();
          },
        },
        {
          tx: -a * t * 0.05,
          ty: a * t * 0.03,
          rot: -(0.1 * a),
          path: () => {
            for (let i = 1; i < 5; i++) {
              const l = (i / 5) * PI * 2 - PI / 2;
              const r = l + PI / 5;
              const ox = Math.cos(l) * t * 0.38;
              const oy = Math.sin(l) * t * 0.38;
              if (i === 1) e.moveTo(ox, oy);
              else e.lineTo(ox, oy);
              e.lineTo(Math.cos(r) * t * 0.13, Math.sin(r) * t * 0.13);
            }
            e.closePath();
          },
        },
      );
    },
  ),
  // Sand dollar
  shell(
    "#D8CCBA",
    "#BFB3A0",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.arc(0, 0, 0.34 * t, 0, 2 * PI);
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.8;
      for (let a = 0; a < 5; a++) {
        const l = (a / 5) * PI * 2 - PI / 2;
        e.beginPath();
        e.ellipse(Math.cos(l) * t * 0.12, Math.sin(l) * t * 0.12, 0.06 * t, 0.16 * t, l, 0, 2 * PI);
        e.stroke();
      }
      e.fillStyle = accent;
      e.beginPath();
      e.arc(0, 0, 0.04 * t, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.22;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 0.2 * l,
          rot: -(0.2 * a),
          path: () => {
            e.arc(0, 0, 0.32 * t, 0.6 * PI, 1.6 * PI);
            e.lineTo(0, 0);
            e.closePath();
          },
        },
        {
          tx: l,
          ty: -(0.15 * l),
          rot: 0.15 * a,
          path: () => {
            e.arc(0, 0, 0.3 * t, -(0.4 * PI), 0.6 * PI);
            e.lineTo(0, 0);
            e.closePath();
          },
        },
      );
    },
  ),
  // Mussel
  shell(
    "#5A6672",
    "#4A5560",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(0, -(0.42 * t));
      e.bezierCurveTo(-(0.32 * t), -(0.15 * t), -(0.28 * t), 0.2 * t, 0, 0.35 * t);
      e.bezierCurveTo(0.28 * t, 0.2 * t, 0.32 * t, -(0.15 * t), 0, -(0.42 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.5;
      for (let a = 1; a <= 4; a++) {
        const l = -(0.42 * t) + a * t * 0.16;
        const r = 0.15 * t + a * t * 0.04;
        e.beginPath();
        e.ellipse(0, l, r, 0.04 * t, 0, 0, PI);
        e.stroke();
      }
      e.fillStyle = "rgba(120,140,180,0.12)";
      e.beginPath();
      e.ellipse(-(0.05 * t), 0.05 * t, 0.12 * t, 0.2 * t, -0.2, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 2 * a,
          rot: -(0.2 * a),
          path: () => {
            e.moveTo(0, -(0.4 * t));
            e.bezierCurveTo(-(0.3 * t), -(0.1 * t), -(0.25 * t), 0.15 * t, 0, 0.1 * t);
            e.closePath();
          },
        },
        {
          tx: l,
          ty: -a,
          rot: 0.15 * a,
          path: () => {
            e.moveTo(0, -(0.35 * t));
            e.bezierCurveTo(0.28 * t, -(0.1 * t), 0.22 * t, 0.18 * t, 0, 0.3 * t);
            e.closePath();
          },
        },
      );
    },
  ),
  // Auger / tower
  shell(
    "#CCBA9E",
    "#B8A688",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(0, -(0.45 * t));
      e.quadraticCurveTo(-(0.06 * t), -(0.3 * t), -(0.12 * t), -(0.1 * t));
      e.quadraticCurveTo(-(0.18 * t), 0.15 * t, -(0.14 * t), 0.35 * t);
      e.quadraticCurveTo(0, 0.45 * t, 0.14 * t, 0.35 * t);
      e.quadraticCurveTo(0.18 * t, 0.15 * t, 0.12 * t, -(0.1 * t));
      e.quadraticCurveTo(0.06 * t, -(0.3 * t), 0, -(0.45 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.6;
      for (let a = 0; a < 6; a++) {
        const l = -(0.35 * t) + a * t * 0.13;
        const r = 0.05 * t + a * t * 0.02;
        e.beginPath();
        e.moveTo(-r, l);
        e.lineTo(r, l);
        e.stroke();
      }
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.18;
      halves(
        e,
        color,
        accent,
        {
          tx: -(0.5 * l),
          ty: -a * t * 0.15,
          rot: -(0.3 * a),
          path: () => {
            e.moveTo(0, -(0.43 * t));
            e.quadraticCurveTo(-(0.06 * t), -(0.28 * t), -(0.1 * t), -(0.05 * t));
            e.lineTo(0.1 * t, -(0.05 * t));
            e.quadraticCurveTo(0.06 * t, -(0.28 * t), 0, -(0.43 * t));
          },
        },
        {
          tx: 0.3 * l,
          ty: a * t * 0.05,
          rot: 0.1 * a,
          path: () => {
            e.moveTo(-(0.12 * t), -(0.05 * t));
            e.quadraticCurveTo(-(0.17 * t), 0.15 * t, -(0.13 * t), 0.33 * t);
            e.quadraticCurveTo(0, 0.43 * t, 0.13 * t, 0.33 * t);
            e.quadraticCurveTo(0.17 * t, 0.15 * t, 0.12 * t, -(0.05 * t));
            e.closePath();
          },
        },
      );
    },
  ),
  // Conch
  shell(
    "#C8A878",
    "#B09468",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(0, -(0.48 * t));
      e.bezierCurveTo(-(0.08 * t), -(0.35 * t), -(0.2 * t), -(0.12 * t), -(0.22 * t), 0.1 * t);
      e.bezierCurveTo(-(0.24 * t), 0.28 * t, -(0.12 * t), 0.42 * t, 0.04 * t, 0.42 * t);
      e.bezierCurveTo(0.18 * t, 0.42 * t, 0.28 * t, 0.22 * t, 0.22 * t, 0.05 * t);
      e.bezierCurveTo(0.18 * t, -(0.15 * t), 0.1 * t, -(0.32 * t), 0, -(0.48 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.7;
      for (let a = 0; a < 5; a++) {
        const l = -(0.3 * t) + a * t * 0.15;
        const r = 0.08 * t + a * t * 0.03;
        e.beginPath();
        e.moveTo(-(0.18 * t) + a * t * 0.01, l);
        e.quadraticCurveTo(0, l - r, 0.16 * t - a * t * 0.01, l);
        e.stroke();
      }
      e.fillStyle = "rgba(255,240,220,0.15)";
      e.beginPath();
      e.ellipse(0.02 * t, 0.18 * t, 0.08 * t, 0.16 * t, 0.2, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: -a * t * 0.1,
          rot: -(0.25 * a),
          path: () => {
            e.moveTo(0, -(0.46 * t));
            e.bezierCurveTo(-(0.08 * t), -(0.3 * t), -(0.2 * t), -(0.1 * t), -(0.2 * t), 0.1 * t);
            e.lineTo(0, 0.05 * t);
            e.closePath();
          },
        },
        {
          tx: l,
          ty: a * t * 0.08,
          rot: 0.15 * a,
          path: () => {
            e.moveTo(0, -(0.2 * t));
            e.bezierCurveTo(0.22 * t, 0 * t, 0.18 * t, 0.35 * t, 0.02 * t, 0.4 * t);
            e.lineTo(-(0.05 * t), 0.1 * t);
            e.closePath();
          },
        },
      );
    },
  ),
  // Cockle
  shell(
    "#D8B898",
    "#C4A480",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.moveTo(0, -(0.35 * t));
      e.bezierCurveTo(-(0.42 * t), -(0.35 * t), -(0.42 * t), 0.15 * t, 0, 0.38 * t);
      e.bezierCurveTo(0.42 * t, 0.15 * t, 0.42 * t, -(0.35 * t), 0, -(0.35 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.8;
      for (let a = -4; a <= 4; a++) {
        const l = (a / 6) * 0.8;
        e.beginPath();
        e.moveTo(0, -(0.3 * t));
        const r = Math.sin(l) * t * 0.38;
        const i = 0.32 * t;
        e.quadraticCurveTo(0.5 * r, 0.4 * i, r, i);
        e.stroke();
      }
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.22;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 2 * a,
          rot: -(0.2 * a),
          path: () => {
            e.moveTo(0, -(0.33 * t));
            e.bezierCurveTo(-(0.4 * t), -(0.33 * t), -(0.4 * t), 0.12 * t, 0, 0.15 * t);
            e.closePath();
          },
        },
        {
          tx: l,
          ty: -a,
          rot: 0.18 * a,
          path: () => {
            e.moveTo(0, -(0.33 * t));
            e.bezierCurveTo(0.4 * t, -(0.33 * t), 0.4 * t, 0.12 * t, 0, 0.35 * t);
            e.closePath();
          },
        },
      );
    },
  ),
  // Periwinkle
  shell(
    "#A8B0A0",
    "#8E9688",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.arc(0, 0.04 * t, 0.3 * t, 0, 2 * PI);
      e.fill();
      e.beginPath();
      e.moveTo(-(0.12 * t), -(0.15 * t));
      e.quadraticCurveTo(0, -(0.42 * t), 0.1 * t, -(0.18 * t));
      e.quadraticCurveTo(0.05 * t, -(0.1 * t), -(0.12 * t), -(0.15 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.6;
      e.beginPath();
      for (let a = 0; a < 4 * PI; a += 0.1) {
        const l = 0.04 * t + a * t * 0.02;
        const x = Math.cos(a) * l;
        const y = 0.04 * t + Math.sin(a) * l * 0.7;
        if (a < 0.1) e.moveTo(x, y);
        else e.lineTo(x, y);
      }
      e.stroke();
      e.fillStyle = "rgba(200,220,210,0.15)";
      e.beginPath();
      e.ellipse(0.06 * t, 0.06 * t, 0.14 * t, 0.18 * t, 0.3, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.2;
      halves(
        e,
        color,
        accent,
        {
          tx: -l,
          ty: 0.3 * l,
          rot: -(0.2 * a),
          path: () => {
            e.arc(0, 0, 0.28 * t, 0.5 * PI, 1.5 * PI);
            e.lineTo(0, 0);
            e.closePath();
          },
        },
        {
          tx: l,
          ty: -(0.2 * l),
          rot: 0.15 * a,
          path: () => {
            e.arc(0, 0, 0.25 * t, -(0.5 * PI), 0.5 * PI);
            e.lineTo(0, 0);
            e.closePath();
          },
        },
      );
    },
  ),
  // Top snail
  shell(
    "#B0A898",
    "#989080",
    (e, t, color, accent) => {
      e.fillStyle = color;
      e.beginPath();
      e.ellipse(0, 0, 0.24 * t, 0.28 * t, 0, 0, 2 * PI);
      e.fill();
      e.beginPath();
      e.moveTo(-(0.06 * t), -(0.22 * t));
      e.quadraticCurveTo(0, -(0.38 * t), 0.05 * t, -(0.24 * t));
      e.fill();
      e.strokeStyle = accent;
      e.lineWidth = 0.5;
      for (let a = 0; a < 4; a++) {
        const l = -(0.15 * t) + a * t * 0.1;
        e.beginPath();
        e.ellipse(0, l, 0.2 * t + a * t * 0.01, 0.03 * t, -0.15, 0, PI);
        e.stroke();
      }
      e.fillStyle = accent;
      e.beginPath();
      e.ellipse(0.04 * t, 0.08 * t, 0.08 * t, 0.12 * t, 0.2, 0, 2 * PI);
      e.fill();
    },
    (e, t, a, color, accent) => {
      const l = a * t * 0.18;
      halves(
        e,
        color,
        accent,
        { tx: -l, ty: a, rot: -(0.2 * a), path: () => e.ellipse(0, 0, 0.14 * t, 0.26 * t, -0.1, 0, 2 * PI) },
        { tx: l, ty: -(0.5 * a), rot: 0.15 * a, path: () => e.ellipse(0, 0, 0.12 * t, 0.2 * t, 0.1, 0, 2 * PI) },
      );
    },
  ),
];

export function createShells(): Shell[] {
  const rand = seededRandom(314159);
  const shells: Shell[] = [];
  for (let n = 0; n < 32; n++) {
    shells.push({
      x: 0.05 + 0.9 * rand(),
      y: 0.38 + 0.55 * rand(),
      size: 10 + 26 * rand(),
      rotation: rand() * Math.PI * 2,
      type: (rand() * SHELL_TYPES.length) | 0,
      cracked: false,
      crackT: 0,
      opacity: 1,
    });
  }
  return shells;
}

/** Index of the top-most intact-or-cracking shell under (px, py), or -1. */
export function hitShell(shells: Shell[], px: number, py: number, w: number, h: number): number {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    if (s.cracked && s.crackT >= 1) continue;
    const dx = px - s.x * w;
    const dy = py - s.y * h;
    if (dx * dx + dy * dy < s.size * s.size * 4) return i;
  }
  return -1;
}

export function updateShells(shells: Shell[], dt: number) {
  for (const s of shells) {
    if (s.cracked && s.crackT < 1) {
      s.crackT = Math.min(1, s.crackT + 2.5 * dt);
      if (s.crackT > 0.8) s.opacity = 1 - (s.crackT - 0.8) / 0.19999999999999996;
    }
  }
}

/** Shells hide under the water once the wave line rises past them. */
export function drawShells(ctx: Ctx2D, shells: Shell[], w: number, h: number, waveY: number) {
  for (const s of shells) {
    if (s.opacity <= 0) continue;
    const py = s.y * h;
    const above = waveY - py;
    if (above > 2 * s.size) continue;
    const fade = above > 0 ? 1 - Math.min(1, above / (2 * s.size)) : 1;
    const type = SHELL_TYPES[s.type % SHELL_TYPES.length];
    ctx.save();
    ctx.translate(s.x * w, py);
    ctx.rotate(s.rotation);
    ctx.globalAlpha = 0.9 * s.opacity * fade;
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    if (s.cracked) type.drawCracked(ctx, s.size, s.crackT);
    else type.draw(ctx, s.size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
