import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function GuestLandingHero() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-10 text-center sm:max-w-2xl sm:py-14">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("guest.hero.title", "Chia tiền công bằng, minh bạch")}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t(
            "guest.hero.subtitle",
            "FairPay giúp bạn theo dõi nợ, nhóm chi phí và thanh toán dễ dàng.",
          )}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
          <Link to="/register">{t("guest.hero.ctaSignup", "Đăng ký miễn phí")}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="min-h-11 w-full sm:w-auto">
          <Link to="/login">{t("guest.hero.ctaLogin", "Đăng nhập")}</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("guest.hero.calculatorLead", "Chưa cần tài khoản?")}{" "}
        <Link to="/tools/expense-calculator" className="font-medium text-primary hover:underline">
          {t("guest.hero.calculatorLink", "Thử máy tính chia tiền")}
        </Link>
      </p>
    </section>
  );
}
