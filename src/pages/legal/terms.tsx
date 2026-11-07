import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TermsOfService } from "@/components/dashboard/legal/TermsOfService";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export function TermsPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("terms.seoTitle", "Terms of Service - FairPay");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        t("terms.seoDescription", "FairPay terms of service."),
      );
    }

    return injectJsonLd([
      {
        id: "breadcrumb-terms-schema",
        data: buildBreadcrumbSchema(
          t("terms.title", "Terms of Service"),
          "/terms",
        ),
      },
    ]);
  }, [t]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <h1 className="sr-only">{t("terms.title", "Terms of Service")}</h1>
      <TermsOfService />
    </div>
  );
}

export default TermsPage;
