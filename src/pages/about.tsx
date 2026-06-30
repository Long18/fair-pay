import { useEffect } from "react";
import { AboutUs } from "@/components/dashboard/legal/AboutUs";
import { buildBreadcrumbSchema, injectJsonLd } from "@/lib/seo";

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is FairPay?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FairPay is a free web application that helps you split expenses fairly with friends and groups. It tracks shared costs, calculates who owes whom automatically, and simplifies debt settlement.",
      },
    },
    {
      "@type": "Question",
      name: "How does expense splitting work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You create a group or add friends, then record shared expenses. FairPay automatically calculates the balances — showing exactly who owes what to whom — so you can settle up without arguments or manual calculations.",
      },
    },
    {
      "@type": "Question",
      name: "Is FairPay free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, FairPay has a free plan that includes up to 5 groups, 3-month expense history, and basic splitting features. A Pro plan is available for 99,000₫/month with unlimited groups, unlimited history, and advanced features.",
      },
    },
    {
      "@type": "Question",
      name: "What currencies does FairPay support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "FairPay supports multiple currencies including VND (Vietnamese Dong), USD, EUR, and more. You can record expenses in any currency and track balances accordingly.",
      },
    },
    {
      "@type": "Question",
      name: "How do I settle a debt in FairPay?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Once you've made a payment to someone, record it in FairPay by tapping 'Record Payment'. The system will update the balance automatically. You can record payments made by bank transfer, cash, MoMo, or any other method.",
      },
    },
    {
      "@type": "Question",
      name: "Is my financial data safe with FairPay?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. FairPay uses row-level security to protect your financial data, ensuring only you can access your information. Data is encrypted in transit and your information is never shared with third parties.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use FairPay for group travel?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. FairPay is perfect for group travel. Create a trip group, add all travelers, record expenses as they happen (meals, accommodation, transport), and FairPay will track who owes what throughout the trip.",
      },
    },
  ],
};

export const AboutPage = () => {
  useEffect(() => {
    document.title = "About FairPay - Free Expense Splitting App";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Learn about FairPay, our mission to make shared expenses simple, our team, and the technology behind the expense splitting app.");

    return injectJsonLd([
      { id: "faq-schema", data: FAQ_SCHEMA },
      { id: "breadcrumb-about-schema", data: buildBreadcrumbSchema("About", "/about") },
    ]);
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="sr-only">About FairPay - Split Expenses Fairly</h1>
      <AboutUs />
    </div>
  );
};
