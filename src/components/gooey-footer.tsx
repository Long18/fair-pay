import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HeartIcon } from "@/components/ui/icons";

// ─── Types ──────────────────────────────────────────────────────────

interface GooeyFooterProps {
  className?: string;
}

// ─── Particle Generator (stable across renders) ─────────────────────

const PARTICLE_COUNT = 80;

function generateParticleStyles(): React.CSSProperties[] {
  const styles: React.CSSProperties[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 3 + Math.random() * 6;
    const distance = 10 + Math.random() * 15;
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

// ─── Component ──────────────────────────────────────────────────────

export function GooeyFooter({ className }: GooeyFooterProps) {
  const { t } = useTranslation();
  const particleStyles = useMemo(() => generateParticleStyles(), []);

  return (
    <footer
      className={cn("gooey-footer-wrapper", className)}
      role="contentinfo"
    >
      {/* SVG filter definition — must be inside the DOM tree */}
      <svg
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="gooey-footer-liquid">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="12"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="liquid"
            />
          </filter>
        </defs>
      </svg>

      {/* Gooey liquid bubble animation */}
      <div className="gooey-animation-container" aria-hidden="true">
        {particleStyles.map((style, i) => (
          <span key={i} className="gooey-particle" style={style} />
        ))}
      </div>

      {/* Footer content */}
      <div className="gooey-footer-content">
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
          {[
            { href: "/about", label: t("footer.about", "About") },
            { href: "/contact", label: t("footer.contact", "Contact") },
            { href: "/privacy", label: t("footer.privacy", "Privacy Policy") },
            { href: "/terms", label: t("footer.terms", "Terms of Service") },
          ].map((link, i, arr) => (
            <span key={link.href} className="contents">
              <a
                href={link.href}
                className="text-primary-foreground/65 hover:text-primary-foreground hover:font-semibold transition-all duration-200"
              >
                {link.label}
              </a>
              {i < arr.length - 1 && (
                <span className="text-primary-foreground/30">•</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-1 text-xs text-primary-foreground/50">
          <span>{t("footer.madeWith", "Made with")}</span>
          <HeartIcon size={12} className="text-primary-foreground/70" />
        </div>
      </div>
    </footer>
  );
}

GooeyFooter.displayName = "GooeyFooter";
