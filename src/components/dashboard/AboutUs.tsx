import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const AboutUs = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("about.title", "About FairPay")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 prose prose-sm max-w-none dark:prose-invert">
          <div>
            <p className="text-muted-foreground">
              {t("about.subtitle", "Making shared expenses simple and transparent")}
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("about.mission.title", "Our Mission")}
            </h2>
            <p>
              {t("about.mission.content", "FairPay was built to solve a common problem: splitting expenses with friends, roommates, and groups should not be complicated. Our mission is to make shared finances transparent, fair, and stress-free for everyone involved.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("about.whatWeDo.title", "What We Do")}
            </h2>
            <p className="mb-2">
              {t("about.whatWeDo.content", "FairPay is a free expense splitting application that helps you:")}
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{t("about.whatWeDo.item1", "Split bills and expenses with friends and groups")}</li>
              <li>{t("about.whatWeDo.item2", "Track who owes whom with real-time balance updates")}</li>
              <li>{t("about.whatWeDo.item3", "Settle debts easily with payment recording")}</li>
              <li>{t("about.whatWeDo.item4", "Manage group finances with activity feeds and reports")}</li>
              <li>{t("about.whatWeDo.item5", "Support multiple currencies and split methods")}</li>
              <li>{t("about.whatWeDo.item6", "Attach receipts for expense documentation")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("about.team.title", "Our Team")}
            </h2>
            <p>
              {t("about.team.content", "FairPay is developed by a small team of passionate developers who believe in building tools that make everyday life easier. We are committed to creating a reliable, secure, and user-friendly platform for managing shared expenses.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("about.technology.title", "Technology")}
            </h2>
            <p>
              {t("about.technology.content", "Built with modern web technologies, FairPay uses row-level security to protect your financial data. The application works as a progressive web app, meaning you can install it on your phone and use it like a native app. Your data is encrypted in transit and at rest, and we never share your information with third parties.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              {t("about.openSource.title", "Open and Transparent")}
            </h2>
            <p>
              {t("about.openSource.content", "We believe in transparency. FairPay is free to use with no hidden fees or premium tiers. We are continuously improving the platform based on user feedback and community contributions.")}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};
