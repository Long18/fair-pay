import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { cn } from "@/lib/utils";

export const Footer = () => {
  const { t } = useTranslation();
  const go = useGo();

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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} FairPay</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">{t('footer.tagline', 'Split expenses fairly')}</span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => go({ to: "/privacy" })}
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.privacy', 'Privacy Policy')}
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            onClick={() => go({ to: "/terms" })}
            className="text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            {t('footer.terms', 'Terms of Service')}
          </button>
        </div>
      </div>
    </footer>
  );
};

Footer.displayName = "Footer";

