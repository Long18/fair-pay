import { useEffect } from "react";
import { TermsOfService } from "@/components/dashboard/legal/TermsOfService";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export const TermsPage = () => {
  useEffect(() => {
    document.title = "Terms of Service - FairPay Expense Splitting App";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "FairPay terms of service. Read our terms and conditions for using the expense splitting application.");

    return injectJsonLd([
      { id: "breadcrumb-terms-schema", data: buildBreadcrumbSchema("Terms of Service", "/terms") },
    ]);
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="sr-only">FairPay Terms of Service</h1>
      <TermsOfService />
    </div>
  );
};
