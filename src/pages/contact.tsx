import { useEffect } from "react";
import { ContactUs } from "@/components/dashboard/legal/ContactUs";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

export const ContactPage = () => {
  useEffect(() => {
    document.title = "Contact FairPay Support - Expense Splitting Help";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Contact the FairPay team for support, feature requests, bug reports, or account inquiries. We respond within 24 to 48 hours.");

    return injectJsonLd([
      { id: "breadcrumb-contact-schema", data: buildBreadcrumbSchema("Contact", "/contact") },
    ]);
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="sr-only">Contact FairPay Support</h1>
      <ContactUs />
    </div>
  );
};
