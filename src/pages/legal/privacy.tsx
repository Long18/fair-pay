import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PrivacyPolicy } from "@/components/dashboard/legal/PrivacyPolicy";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export function PrivacyPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("privacy.seoTitle", "Privacy Policy - FairPay");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        t(
          "privacy.seoDescription",
          "FairPay privacy policy. Learn how we handle your data.",
        ),
      );
    }

    return injectJsonLd([
      {
        id: "breadcrumb-privacy-schema",
        data: buildBreadcrumbSchema(
          t("privacy.title", "Privacy Policy"),
          "/privacy",
        ),
      },
    ]);
  }, [t]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="sr-only">{t("privacy.title", "Privacy Policy")}</h1>
      <PrivacyPolicy />
    </div>
  );
}

export default PrivacyPage;
