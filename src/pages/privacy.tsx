import { useEffect } from "react";
import { PrivacyPolicy } from "@/components/dashboard/legal/PrivacyPolicy";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export const PrivacyPage = () => {
  useEffect(() => {
    document.title = "Privacy Policy - FairPay Expense Splitting App";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "FairPay privacy policy. Learn how we handle your data, protect your information, and respect your privacy.");

    return injectJsonLd([
      { id: "breadcrumb-privacy-schema", data: buildBreadcrumbSchema("Privacy Policy", "/privacy") },
    ]);
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="sr-only">FairPay Privacy Policy</h1>
      <PrivacyPolicy />
    </div>
  );
};
