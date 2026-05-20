import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { usePlan } from "@/modules/billing";

export default function PricingPage() {
  const { t } = useTranslation();
  const { isPro } = usePlan();

  const handleUpgrade = () => {
    // Mock payment — in production, integrate with payment provider
    console.log("[FairPay] Upgrade to Pro clicked — payment integration pending");
    alert(t("billing.mockPayment", "Tính năng thanh toán đang được phát triển. Vui lòng liên hệ admin."));
  };

  const freeTier = [
    t("billing.freeFeature1", "Tối đa 5 nhóm"),
    t("billing.freeFeature2", "Lịch sử 3 tháng"),
    t("billing.freeFeature3", "Chia tiền cơ bản"),
    t("billing.freeFeature4", "Thanh toán ngang hàng"),
  ];

  const proTier = [
    t("billing.proFeature1", "Nhóm không giới hạn"),
    t("billing.proFeature2", "Lịch sử không giới hạn"),
    t("billing.proFeature3", "Chia theo tỉ lệ nâng cao"),
    t("billing.proFeature4", "Xuất dữ liệu CSV/PDF"),
    t("billing.proFeature5", "Thông báo đẩy ưu tiên"),
    t("billing.proFeature6", "Hỗ trợ ưu tiên"),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">FairPay</Link>
          <Button variant="ghost" asChild size="sm">
            <Link to="/">{t("billing.backToApp", "← Về trang chính")}</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">{t("billing.pricingTitle", "Chọn gói phù hợp")}</h1>
          <p className="text-muted-foreground text-lg">{t("billing.pricingSubtitle", "Bắt đầu miễn phí, nâng cấp khi cần")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free */}
          <Card className={cn("relative", !isPro && "border-primary/50 ring-1 ring-primary/20")}>
            {!isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  {t("billing.currentPlan", "Gói hiện tại")}
                </span>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t("billing.freePlan", "Free")}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">0₫</span>
                <span className="text-muted-foreground"> / {t("billing.month", "tháng")}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {freeTier.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4" disabled={!isPro} asChild={isPro}>
                {isPro ? <Link to="/">{t("billing.switchToFree", "Dùng gói Free")}</Link> : <span>{t("billing.currentPlan", "Gói hiện tại")}</span>}
              </Button>
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className={cn("relative", isPro && "border-primary/50 ring-1 ring-primary/20")}>
            {isPro && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  {t("billing.currentPlan", "Gói hiện tại")}
                </span>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Pro ✨</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">99.000₫</span>
                <span className="text-muted-foreground"> / {t("billing.month", "tháng")}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {proTier.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckIcon className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <Button className="w-full mt-4" disabled={isPro} onClick={handleUpgrade}>
                {isPro ? t("billing.alreadyPro", "Đang dùng Pro") : t("billing.upgradeToPro", "Nâng cấp lên Pro")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
