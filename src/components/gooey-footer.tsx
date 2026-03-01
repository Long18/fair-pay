import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HeartIcon } from "@/components/ui/icons";

// ─── Types ──────────────────────────────────────────────────────────

interface GooeyFooterProps {
  className?: string;
}

// ─── Particle spawner (imperative DOM, like the reference) ──────────

function useGooeyParticles(containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const fragment = document.createDocumentFragment();
    const PARTICLE_COUNT = 100;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const span = document.createElement("span");
      span.classList.add("gooey-particle");
      span.style.setProperty("--dim", `${3 + Math.random() * 6}rem`);
      span.style.setProperty("--uplift", `${10 + Math.random() * 15}rem`);
      span.style.setProperty("--pos-x", `${Math.random() * 100}%`);
      span.style.setProperty("--dur", `${3 + Math.random() * 3}s`);
      span.style.setProperty("--delay", `${-1 * (Math.random() * 10)}s`);
      fragment.appendChild(span);
    }

    container.appendChild(fragment);

    return () => {
      // Cleanup particles on unmount
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [containerRef]);
}

// ─── Component ──────────────────────────────────────────────────────

export function GooeyFooter({ className }: GooeyFooterProps) {
  const { t } = useTranslation();
  const particleContainerRef = useRef<HTMLDivElement>(null);

  useGooeyParticles(particleContainerRef);

  return (
    <div className={cn("gooey-footer-section", className)}>
      {/* SVG filter — must be in DOM for url(#id) to work */}
      <svg
        style={{ position: "absolute", width: 0, height: 0 }}
        aria-hidden="true"
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

      {/* Gooey bubble animation container */}
      <div
        ref={particleContainerRef}
        className="gooey-bubbles"
        aria-hidden="true"
      />

      {/* Actual footer bar */}
      <footer className="gooey-footer-bar" role="contentinfo">
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
      </footer>
    </div>
  );
}

GooeyFooter.displayName = "GooeyFooter";
