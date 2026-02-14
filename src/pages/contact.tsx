import { useEffect } from "react";
import { ContactUs } from "@/components/dashboard/ContactUs";

export const ContactPage = () => {
  useEffect(() => {
    document.title = "Contact Us - FairPay";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Contact the FairPay team for support, feature requests, bug reports, or account inquiries. We respond within 24 to 48 hours.");
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <ContactUs />
    </div>
  );
};
