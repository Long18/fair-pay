import { useEffect } from "react";
import { AboutUs } from "@/components/dashboard/AboutUs";

export const AboutPage = () => {
  useEffect(() => {
    document.title = "About - FairPay";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Learn about FairPay, our mission to make shared expenses simple, our team, and the technology behind the expense splitting app.");
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <AboutUs />
    </div>
  );
};
