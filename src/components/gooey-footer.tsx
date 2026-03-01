import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ─── Imperative particle spawner (matches reference exactly) ────────

function useGooeyParticles(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const frag = document.createDocumentFragment();
    for (let i = 0; i < 100; i++) {
      const s = document.createElement("span");
      s.classList.add("gooey-particle");
      s.style.setProperty("--dim", `${3 + Math.random() * 6}rem`);
      s.style.setProperty("--uplift", `${10 + Math.random() * 15}rem`);
      s.style.setProperty("--pos-x", `${Math.random() * 100}%`);
      s.style.setProperty("--dur", `${3 + Math.random() * 3}s`);
      s.style.setProperty("--delay", `${-1 * Math.random() * 10}s`);
      frag.appendChild(s);
    }
    el.appendChild(frag);
    return () => { el.innerHTML = ""; };
  }, [ref]);
}

// ─── Component ──────────────────────────────────────────────────────

export function GooeyFooter({ className }: { className?: string }) {
  const { t } = useTranslation();
  const bubbleRef = useRef<HTMLDivElement>(null);
  useGooeyParticles(bubbleRef);

  return (
    <div className={cn("gooey-footer-wrap", className)}>
      {/* SVG gooey filter */}
      <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
        <defs>
          <filter id="gooey-footer-liquid">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="liquid" />
          </filter>
        </defs>
      </svg>

      {/* Bubble animation layer */}
      <div ref={bubbleRef} className="gooey-bubbles" aria-hidden="true" />

      {/* Original compact footer — identical to pre-268ab30 */}
      <footer
        className={cn(
          "border-t",
          "bg-background/95",
          "backdrop-blur-sm",
          "mt-auto",
          "py-4",
          "px-6",
          "relative z-10"
        )}
      >
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} FairPay</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">
              {t("footer.tagline", "Split expenses fairly")}
            </span>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex items-center gap-4 text-sm flex-wrap justify-center"
          >
            <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              {t("footer.about", "About")}
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              {t("footer.contact", "Contact")}
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              {t("footer.privacy", "Privacy Policy")}
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline">
              {t("footer.terms", "Terms of Service")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

GooeyFooter.displayName = "GooeyFooter";
