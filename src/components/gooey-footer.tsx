import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HeartIcon } from "@/components/ui/icons";

// ─── Types ──────────────────────────────────────────────────────────

interface GooeyFooterProps {
  className?: string;
}

// ─── Particle Generator (stable across renders) ─────────────────────

const PARTICLE_COUNT = 60;

function generateParticleStyles(): React.CSSProperties[] {
  const styles: React.CSSProperties[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 2 + Math.random() * 4;
    const distance = 8 + Math.random() * 12;
    const position = Math.random() * 100;
    const time = 3 + Math.random() * 3;
    const delay = -1 * (Math.random() * 10);
    styles.push({
      "--dim": `${size}rem`,
      "--uplift": `${distance}rem`,
      "--pos-x": `${position}%`,
      "--dur": `${time}s`,
      "--delay": `${delay}s`,
    } as React.CSSProperties);
  }
  return styles;
}

// ─── SVG Filter ─────────────────────────────────────────────────────

function GooeyFilter() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="gooey-footer-liquid">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="liquid"
          />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────

export function GooeyFooter({ className }: GooeyFooterProps) {
  const { t } = useTranslation();
  const particleStyles = useMemo(() => generateParticleStyles(), []);

  return (
    <>
      <GooeyFilter />
      <footer
        className={cn("relative mt-auto bg-primary", className)}
        role="contentinfo"
      >
        {/* Gooey liquid animation layer */}
        <div className="gooey-animation-container" aria-hidden="true">
          {particleStyles.map((style, i) => (
            <span key={i} className="gooey-particle" style={style} />
          ))}
        </div>

        {/* Compact footer content — single row */}
        <div className="relative z-10 mx-auto flex flex-col items-center gap-4 px-6 py-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
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
            <a
              href="/about"
              className="text-primary-foreground/65 hover:text-primary-foreground transition-colors"
            >
              {t("footer.about", "About")}
            </a>
            <span className="text-primary-foreground/30">•</span>
            <a
              href="/contact"
              className="text-primary-foreground/65 hover:text-primary-foreground transition-colors"
            >
              {t("footer.contact", "Contact")}
            </a>
            <span className="text-primary-foreground/30">•</span>
            <a
              href="/privacy"
              className="text-primary-foreground/65 hover:text-primary-foreground transition-colors"
            >
              {t("footer.privacy", "Privacy Policy")}
            </a>
            <span className="text-primary-foreground/30">•</span>
            <a
              href="/terms"
              className="text-primary-foreground/65 hover:text-primary-foreground transition-colors"
            >
              {t("footer.terms", "Terms of Service")}
            </a>
          </nav>

          <div className="flex items-center gap-1 text-xs text-primary-foreground/50">
            <span>{t("footer.madeWith", "Made with")}</span>
            <HeartIcon size={12} className="text-primary-foreground/70" />
          </div>
        </div>
      </footer>
    </>
  );
}

GooeyFooter.displayName = "GooeyFooter";
