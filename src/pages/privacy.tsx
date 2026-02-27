import { useEffect } from "react";
import { PrivacyPolicy } from "@/components/dashboard/legal/PrivacyPolicy";

export const PrivacyPage = () => {
  useEffect(() => {
    document.title = "Privacy Policy - FairPay";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "FairPay privacy policy. Learn how we handle your data, protect your information, and respect your privacy.");
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <PrivacyPolicy />
    </div>
  );
};
