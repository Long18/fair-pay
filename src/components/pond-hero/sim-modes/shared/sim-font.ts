let cachedSans: string | null = null;
let cachedMono: string | null = null;

/** Project body font stack (Soehne via Tailwind `font-sans`). */
export function projectSansFamily(): string {
  if (cachedSans) return cachedSans;
  if (typeof document === "undefined") return "sans-serif";
  cachedSans = getComputedStyle(document.body).fontFamily || "sans-serif";
  return cachedSans;
}

/** Project monospace stack (Soehne Mono via Tailwind `font-mono`). */
export function projectMonoFamily(): string {
  if (cachedMono) return cachedMono;
  if (typeof document === "undefined") return "monospace";
  const probe = document.createElement("span");
  probe.className = "font-mono";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  cachedMono = getComputedStyle(probe).fontFamily || "monospace";
  probe.remove();
  return cachedMono;
}

/** Canvas `ctx.font` string using the project font. */
export function simFont(px: number, weight: number | string = 400, mono = false): string {
  return `${weight} ${px}px ${mono ? projectMonoFamily() : projectSansFamily()}`;
}
