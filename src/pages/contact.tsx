import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ContactUs } from "@/components/dashboard/legal/ContactUs";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export const ContactPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("contact.seo.title", "Liên hệ FairPay — Hỗ trợ");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        t(
          "contact.seo.description",
          "Liên hệ đội ngũ FairPay — hỗ trợ, góp ý tính năng và báo lỗi.",
        ),
      );
    }

    return injectJsonLd([
      {
        id: "breadcrumb-contact-schema",
        data: buildBreadcrumbSchema(t("contact.title", "Liên hệ"), "/contact"),
      },
    ]);
  }, [t]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="sr-only">Contact FairPay Support</h1>
      <ContactUs />
    </div>
  );
};
