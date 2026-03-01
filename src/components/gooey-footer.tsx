import { useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import {
  FairPayIcon,
  MailIcon,
  GlobeIcon,
  HeartIcon,
} from "@/components/ui/icons";

// ─── Types ──────────────────────────────────────────────────────────

interface FooterColumn {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}

interface GooeyFooterProps {
  variant?: "client" | "admin";
  className?: string;
}

// ─── Particle Generator ─────────────────────────────────────────────

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

// ─── SVG Filter (rendered once) ─────────────────────────────────────

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

export function GooeyFooter({ variant = "client", className }: GooeyFooterProps) {
  const { t } = useTranslation();
  const particleStyles = useMemo(() => generateParticleStyles(), []);

  const columns: FooterColumn[] = useMemo(() => {
    if (variant === "admin") {
      return [
        {
          title: t("footer.admin.management", "Management"),
          links: [
            { label: t("footer.admin.overview", "Overview"), href: "/admin" },
            { label: t("footer.admin.people", "People"), href: "/admin/people" },
            { label: t("footer.admin.transactions", "Transactions"), href: "/admin/transactions" },
          ],
        },
        {
          title: t("footer.admin.system", "System"),
          links: [
            { label: t("footer.admin.notifications", "Notifications"), href: "/admin/notifications" },
            { label: t("footer.admin.auditLogs", "Audit Logs"), href: "/admin/audit-logs" },
            { label: t("footer.admin.reactions", "Reactions"), href: "/admin/reactions" },
          ],
        },
        {
          title: t("footer.legal", "Legal"),
          links: [
            { label: t("footer.privacy", "Privacy Policy"), href: "/privacy" },
            { label: t("footer.terms", "Terms of Service"), href: "/terms" },
            { label: t("footer.contact", "Contact"), href: "/contact" },
          ],
        },
      ];
    }

    return [
      {
        title: t("footer.company", "Company"),
        links: [
          { label: t("footer.about", "About"), href: "/about" },
          { label: t("footer.contact", "Contact"), href: "/contact" },
        ],
      },
      {
        title: t("footer.legal", "Legal"),
        links: [
          { label: t("footer.privacy", "Privacy Policy"), href: "/privacy" },
          { label: t("footer.terms", "Terms of Service"), href: "/terms" },
        ],
      },
      {
        title: t("footer.resources", "Resources"),
        links: [
          { label: t("footer.help", "Help Center"), href: "/help" },
          { label: t("footer.tagline", "Split expenses fairly"), href: "/" },
        ],
      },
    ];
  }, [t, variant]);

  return (
    <>
      <GooeyFilter />
      <footer
        className={cn(
          "relative mt-auto",
          "bg-primary",
          className
        )}
        role="contentinfo"
      >
        {/* Gooey animation layer */}
        <div
          className="gooey-animation-container"
          aria-hidden="true"
        >
          {particleStyles.map((style, i) => (
            <span
              key={i}
              className="gooey-particle"
              style={style}
            />
          ))}
        </div>

        {/* Footer content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-8">
          {/* Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-12">
            {columns.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary-foreground/90">
                  {col.title}
                </h4>
                {col.links.map((link) => (
                  <Link
                    key={link.href + link.label}
                    to={link.href}
                    className={cn(
                      "text-sm text-primary-foreground/70",
                      "transition-all duration-200",
                      "hover:text-primary-foreground hover:translate-y-[-2px]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 focus-visible:rounded-sm",
                      "w-fit"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center gap-3 border-t border-primary-foreground/15 pt-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
              <FairPayIcon className="h-5 w-5" />
              <span>© {new Date().getFullYear()} FairPay</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary-foreground/50">
              <span>{t("footer.madeWith", "Made with")}</span>
              <HeartIcon size={12} className="text-primary-foreground/70" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

GooeyFooter.displayName = "GooeyFooter";
