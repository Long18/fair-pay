import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const TermsOfService = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("terms.title", "Terms of Service")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
          <div>
            <p className="text-muted-foreground">
              {t("terms.lastUpdated", "Last updated: {{date}}", { date: new Date().toLocaleDateString() })}
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section1.title", "1. Acceptance of Terms")}
            </h2>
            <p>
              {t("terms.section1.content", "By accessing or using FairPay, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section2.title", "2. Description of Service")}
            </h2>
            <p>
              {t("terms.section2.content", "FairPay is a platform that helps you track shared expenses, split bills, and manage debts with friends and groups. We provide tools to record expenses, calculate splits, and settle balances.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section3.title", "3. User Accounts")}
            </h2>
            <p className="mb-2">
              {t("terms.section3.content", "To use certain features, you must create an account. You agree to:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section3.item1", "Provide accurate and complete information")}</li>
              <li>{t("terms.section3.item2", "Maintain the security of your account credentials")}</li>
              <li>{t("terms.section3.item3", "Accept responsibility for all activities under your account")}</li>
              <li>{t("terms.section3.item4", "Notify us immediately of any unauthorized use")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section4.title", "4. User Conduct")}
            </h2>
            <p className="mb-2">
              {t("terms.section4.content", "You agree not to:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("terms.section4.item1", "Use the service for any illegal purpose")}</li>
              <li>{t("terms.section4.item2", "Impersonate any person or entity")}</li>
              <li>{t("terms.section4.item3", "Interfere with or disrupt the service")}</li>
              <li>{t("terms.section4.item4", "Attempt to gain unauthorized access to any part of the service")}</li>
              <li>{t("terms.section4.item5", "Upload malicious code or viruses")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section5.title", "5. Financial Information")}
            </h2>
            <p>
              {t("terms.section5.content", "FairPay is a tracking tool only. We do not process payments, hold funds, or act as a financial intermediary. All financial transactions between users are their own responsibility. We are not liable for any disputes, losses, or issues arising from financial arrangements between users.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section6.title", "6. Intellectual Property")}
            </h2>
            <p>
              {t("terms.section6.content", "The service and its original content, features, and functionality are owned by FairPay and are protected by international copyright, trademark, and other intellectual property laws.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section7.title", "7. Termination")}
            </h2>
            <p>
              {t("terms.section7.content", "We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section8.title", "8. Disclaimer of Warranties")}
            </h2>
            <p>
              {t("terms.section8.content", "The service is provided 'as is' without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section9.title", "9. Limitation of Liability")}
            </h2>
            <p>
              {t("terms.section9.content", "To the fullest extent permitted by law, FairPay shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section10.title", "10. Changes to Terms")}
            </h2>
            <p>
              {t("terms.section10.content", "We reserve the right to modify these terms at any time. We will notify users of any material changes. Your continued use of the service after such changes constitutes acceptance of the new terms.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("terms.section11.title", "11. Contact Information")}
            </h2>
            <p>
              {t("terms.section11.content", "If you have questions about these Terms of Service, please contact us through the app or email us at support@fairpay.app")}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

