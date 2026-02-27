import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const ContactUs = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("contact.title", "Contact Us")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
          <div>
            <p className="text-muted-foreground">
              {t("contact.subtitle", "We are here to help with any questions or feedback")}
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("contact.email.title", "Email Support")}
            </h2>
            <p>
              {t("contact.email.content", "For general inquiries, feature requests, or bug reports, reach out to us at:")}
            </p>
            <p className="mt-2">
              <a href="mailto:us.thanhlong18@gmail.com" className="text-primary hover:underline">
                us.thanhlong18@gmail.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("contact.feedback.title", "Feature Requests and Feedback")}
            </h2>
            <p>
              {t("contact.feedback.content", "We value your input and are always looking to improve FairPay. If you have suggestions for new features or improvements, please send us an email with your ideas. We review every piece of feedback and prioritize features based on community demand.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("contact.bugs.title", "Bug Reports")}
            </h2>
            <p>
              {t("contact.bugs.content", "Found a bug? Please include as much detail as possible when reporting issues: what you were doing, what you expected to happen, and what actually happened. Screenshots are always helpful. We aim to respond to all bug reports within 48 hours.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("contact.account.title", "Account and Data Requests")}
            </h2>
            <p>
              {t("contact.account.content", "For account-related inquiries, data export requests, or account deletion, please contact us via email. We will process your request in accordance with our privacy policy and applicable data protection regulations.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("contact.response.title", "Response Times")}
            </h2>
            <p>
              {t("contact.response.content", "We typically respond to inquiries within 24 to 48 hours during business days. For urgent matters, please include 'URGENT' in your email subject line.")}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
