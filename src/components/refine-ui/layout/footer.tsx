import { useConsent } from "@/hooks/use-consent";
import { currentBuildInfo } from "@/lib/build-info";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const footerLinkClass =
  "shrink-0 whitespace-nowrap text-muted-foreground transition-colors underline-offset-4 hover:text-foreground hover:underline";

export const Footer = () => {
  const { t } = useTranslation();
  const { openConsentModal } = useConsent();

  return (
    <footer
      className={cn(
        "border-t",
        "bg-background/95",
        "backdrop-blur-sm",
        "mt-auto",
        "py-2",
        "px-4 md:px-6"
      )}
    >
      <div className="container mx-auto flex flex-col items-center gap-1.5 md:min-h-11 md:flex-row md:items-center md:justify-between md:gap-2 md:pl-20 md:pr-24 lg:pr-28">
        <div className="flex min-w-0 flex-col items-center gap-0 md:flex-row md:items-center md:gap-2 md:shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs leading-tight text-muted-foreground md:justify-start">
            <span>© {new Date().getFullYear()} FairPay</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">
              {t("footer.tagline", "Split expenses fairly")}
            </span>
          </div>
          <span className="hidden text-[10px] leading-tight text-muted-foreground sm:inline md:max-w-[12rem] md:truncate lg:max-w-none">
            {t("footer.version", "Version {{version}}", {
              version: currentBuildInfo.version,
            })}
          </span>
        </div>

        <nav
          aria-label="Footer navigation"
          className={cn(
            "flex w-full min-w-0 max-w-full items-center justify-center gap-x-1.5",
            "overflow-x-auto text-xs leading-tight [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "max-sm:flex-nowrap",
            "md:w-auto md:max-w-[min(100%,36rem)] md:flex-1 md:justify-end md:overflow-visible",
            "lg:max-w-[55%] lg:flex-wrap lg:justify-end"
          )}
        >
          <a href="/about" className={footerLinkClass}>
            {t("footer.about", "About")}
          </a>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            •
          </span>
          <a href="/contact" className={footerLinkClass}>
            {t("footer.contact", "Contact")}
          </a>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            •
          </span>
          <a href="/privacy" className={footerLinkClass}>
            {t("footer.privacy", "Privacy Policy")}
          </a>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            •
          </span>
          <a href="/terms" className={footerLinkClass}>
            {t("footer.terms", "Terms of Service")}
          </a>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            •
          </span>
          <button
            type="button"
            onClick={openConsentModal}
            className={footerLinkClass}
          >
            {t("consent.manage", "Manage cookies")}
          </button>
        </nav>
      </div>
    </footer>
  );
};

Footer.displayName = "Footer";
