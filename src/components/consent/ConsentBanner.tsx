import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/use-consent";

export function ConsentBanner() {
  const { t } = useTranslation();
  const { isConsentBannerVisible, acceptAll, rejectAll, openConsentModal } = useConsent();

  if (!isConsentBannerVisible) return null;

  return (
    <div
      role="region"
      aria-label={t("consent.title", "Cookies & your FairPay experience")}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg backdrop-blur-sm md:bottom-4 md:left-4 md:max-w-lg md:rounded-xl md:border"
    >
      <p className="text-sm text-muted-foreground leading-snug">
        {t(
          "consent.banner.short",
          "Chúng tôi dùng cookie để FairPay hoạt động ổn định và cải thiện trải nghiệm.",
        )}{" "}
        <Link to="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
          {t("consent.policyLinkText", "Privacy Policy")}
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={acceptAll}>
          {t("consent.confirmAll", "Accept all")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={rejectAll}>
          {t("consent.reject", "Decline")}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={openConsentModal}>
          {t("consent.customize", "Customize cookies")}
        </Button>
      </div>
    </div>
  );
}
