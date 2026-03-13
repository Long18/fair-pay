import { currentBuildInfo } from "@/lib/build-info";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer
      className={cn(
        "border-t",
        "bg-background/95",
        "backdrop-blur-sm",
        "mt-auto",
        "py-4",
        "px-6"
      )}
    >
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} FairPay</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">{t('footer.tagline', 'Split expenses fairly')}</span>
          </div>
          <span className="text-xs text-muted-foreground/70">
            {t("footer.version", "Version {{version}}", {
              version: currentBuildInfo.version,
            })}
          </span>
        </div>

        <nav aria-label="Footer navigation" className="flex items-center gap-4 text-sm flex-wrap justify-center">
          <a
            href="/about"
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.about', 'About')}
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="/contact"
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.contact', 'Contact')}
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.privacy', 'Privacy Policy')}
          </a>
          <span className="text-muted-foreground">•</span>
          <a
            href="/terms"
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.terms', 'Terms of Service')}
          </a>
        </nav>
      </div>
    </footer>
  );
};

Footer.displayName = "Footer";
