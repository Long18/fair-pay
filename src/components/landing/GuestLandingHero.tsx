import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function GuestLandingHero() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-10 sm:max-w-xl sm:py-14">
      <div className="flex flex-col gap-8">
        <div className="space-y-3 text-center sm:text-left">
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {t("guest.hero.title", "Chia tiền công bằng, minh bạch")}
          </h1>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t(
              "guest.hero.subtitle",
              "FairPay giúp bạn theo dõi nợ, nhóm chi phí và thanh toán dễ dàng.",
            )}
          </p>
          <p className="text-pretty text-sm text-muted-foreground/90">
            {t(
              "guest.hero.tagline",
              "Chia hóa đơn · theo dõi nợ · thanh toán một chỗ.",
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-start">
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto">
            <Link to="/register">{t("guest.hero.ctaSignup", "Đăng ký miễn phí")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-h-11 w-full sm:w-auto">
            <Link to="/login">{t("guest.hero.ctaLogin", "Đăng nhập")}</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground sm:text-left">
          {t("guest.hero.calculatorLead", "Chưa cần tài khoản?")}{" "}
          <Link to="/tools/expense-calculator" className="font-medium text-primary hover:underline">
            {t("guest.hero.calculatorLink", "Thử máy tính chia tiền")}
          </Link>
        </p>
      </div>
    </section>
  );
}
