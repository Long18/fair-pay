import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const PrivacyPolicy = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("privacy.title", "Privacy Policy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
          <div>
            <p className="text-muted-foreground">
              {t("privacy.lastUpdated", "Last updated: {{date}}", { date: new Date().toLocaleDateString() })}
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section1.title", "1. Information We Collect")}
            </h2>
            <p className="mb-2">
              {t("privacy.section1.content", "We collect information that you provide directly to us when you use FairPay, including:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section1.item1", "Account information (name, email address, profile picture)")}</li>
              <li>{t("privacy.section1.item2", "Expense and payment data you create")}</li>
              <li>{t("privacy.section1.item3", "Group and friend relationships")}</li>
              <li>{t("privacy.section1.item4", "Communication preferences and settings")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section2.title", "2. How We Use Your Information")}
            </h2>
            <p className="mb-2">
              {t("privacy.section2.content", "We use the information we collect to:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section2.item1", "Provide, maintain, and improve our services")}</li>
              <li>{t("privacy.section2.item2", "Process transactions and manage your account")}</li>
              <li>{t("privacy.section2.item3", "Send you notifications and updates about your expenses")}</li>
              <li>{t("privacy.section2.item4", "Respond to your inquiries and provide customer support")}</li>
              <li>{t("privacy.section2.item5", "Detect and prevent fraud or abuse")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section3.title", "3. Information Sharing")}
            </h2>
            <p className="mb-2">
              {t("privacy.section3.content", "We do not sell your personal information. We may share your information only:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section3.item1", "With other users in your groups or friend relationships, as necessary for the service")}</li>
              <li>{t("privacy.section3.item2", "With service providers who assist us in operating our platform")}</li>
              <li>{t("privacy.section3.item3", "When required by law or to protect our rights")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section4.title", "4. Data Security")}
            </h2>
            <p>
              {t("privacy.section4.content", "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section5.title", "5. Your Rights")}
            </h2>
            <p className="mb-2">
              {t("privacy.section5.content", "You have the right to:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("privacy.section5.item1", "Access and update your personal information")}</li>
              <li>{t("privacy.section5.item2", "Delete your account and associated data")}</li>
              <li>{t("privacy.section5.item3", "Opt out of certain communications")}</li>
              <li>{t("privacy.section5.item4", "Export your data")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("privacy.section6.title", "6. Contact Us")}
            </h2>
            <p>
              {t("privacy.section6.content", "If you have questions about this Privacy Policy, please contact us through the app or email us at us.thanhlong18@gmail.com")}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

