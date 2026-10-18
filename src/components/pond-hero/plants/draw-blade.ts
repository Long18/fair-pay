import type { PlantBlade } from "./cluster-config";

export function drawPlantBlade(
  ctx: CanvasRenderingContext2D,
  blade: PlantBlade,
  innerW: number,
  innerH: number,
  time: number,
) {
  const bx = blade.baseX * innerW;
  const by = blade.baseY * innerH;
  const wind =
    8 * Math.sin(0.8 * time + blade.windPhase) * blade.windFlex +
    3 * Math.sin(0.3 * time + 0.7 * blade.windPhase + bx * 0.01) * blade.windFlex;
  const lean = blade.lean + (wind / blade.height) * 0.5;
  const tipX = bx + Math.sin(lean) * blade.height + wind * blade.curve;
  const tipY = by - Math.cos(lean) * blade.height;
  const midX = bx + Math.sin(lean * 0.4) * blade.height * 0.55 + wind * blade.curve * 0.3;
  const midY = by - Math.cos(lean * 0.4) * blade.height * 0.55;
  const hw = blade.width * 0.5;
  const nx = Math.cos(lean * 0.3);
  const ny = Math.sin(lean * 0.3);

  ctx.beginPath();
  ctx.moveTo(bx - nx * hw, by - ny * hw);
  ctx.quadraticCurveTo(midX - nx * hw * 0.5, midY, tipX, tipY);
  ctx.quadraticCurveTo(midX + nx * hw * 0.5, midY, bx + nx * hw, by + ny * hw);
  ctx.closePath();
  ctx.fillStyle = blade.color;
  ctx.fill();

  if (blade.type !== "cattail" || !blade.headHeight) return;

  const headX = bx + Math.sin(lean * 0.72) * blade.height * 0.72 + wind * blade.curve * 0.36;
  const headY = by - Math.cos(lean * 0.72) * blade.height * 0.72;
  const halfH = 0.55 * blade.headHeight;
  const halfW = 1.3 * blade.width;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(0.6 * lean);

  ctx.beginPath();
  ctx.ellipse(0, 0, halfW + 1.2, halfH + 1.5, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(140, 118, 98, 0.25)";
  ctx.fill();

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(halfW, halfH));
  grad.addColorStop(0, "rgba(95, 68, 52, 0.75)");
  grad.addColorStop(0.6, "rgba(120, 92, 72, 0.55)");
  grad.addColorStop(1, "rgba(125, 108, 92, 0.08)");
  ctx.beginPath();
  ctx.ellipse(0, 0, halfW, halfH, 0, 0, 2 * Math.PI);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(65, 48, 38, 0.12)";
  ctx.lineWidth = 0.3;
  for (let y = -(0.6 * halfH); y < 0.6 * halfH; y += 3.5) {
    const half = halfW * Math.sqrt(1 - (y / halfH) * (y / halfH)) * 0.85;
    ctx.beginPath();
    ctx.moveTo(-half, y);
    ctx.lineTo(half, y);
    ctx.stroke();
  }

  const spike = 0.8 * blade.headHeight;
  ctx.beginPath();
  ctx.moveTo(0, -halfH);
  ctx.lineTo(-0.35, -halfH - 0.35 * spike);
  ctx.lineTo(0, -halfH - spike);
  ctx.lineTo(0.35, -halfH - 0.35 * spike);
  ctx.closePath();
  ctx.fillStyle = "rgba(125, 160, 108, 0.6)";
  ctx.fill();
  ctx.restore();
}
