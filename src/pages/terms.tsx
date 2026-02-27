import { useEffect } from "react";
import { TermsOfService } from "@/components/dashboard/legal/TermsOfService";

export const TermsPage = () => {
  useEffect(() => {
    document.title = "Terms of Service - FairPay";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "FairPay terms of service. Read our terms and conditions for using the expense splitting application.");
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <TermsOfService />
    </div>
  );
};
