import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { getSemanticStatusColors } from "@/lib/status-colors";
import { usePlan, MAX_FREE_GROUPS } from "@/modules/billing";
import { supabaseClient } from "@/utility/supabaseClient";

const successColors = getSemanticStatusColors("success");

export default function PricingPage() {
  const { t } = useTranslation();
  const { isPro, isLoading } = usePlan();
  const [searchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const showSuccess = searchParams.get("status") === "success";

  useEffect(() => {
    if (showSuccess) {
      toast.success(
        t("billing.checkoutSuccess", "Thanh toán thành công! Gói Pro sẽ kích hoạt trong giây lát."),
      );
    }
  }, [showSuccess, t]);

  const handleUpgrade = async () => {
    if (isPro || checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabaseClient.functions.invoke("polar-checkout", {
        method: "POST",
        body: {},
      });

      if (error) {
        toast.error(
          error.message ||
            t("billing.checkoutFailed", "Không thể mở trang thanh toán. Thử lại sau."),
        );
        return;
      }

      const url = (data as { url?: string; error?: string } | null)?.url;
      const remoteError = (data as { error?: string } | null)?.error;
      if (!url) {
        toast.error(
          remoteError ||
            t("billing.checkoutUnavailable", "Thanh toán Pro chưa được cấu hình."),
        );
        return;
      }

      window.location.href = url;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("billing.checkoutFailed", "Không thể mở trang thanh toán. Thử lại sau."),
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const freeTier = [
    t("billing.freeFeature1", `Tối đa ${MAX_FREE_GROUPS} nhóm`),
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
          {showSuccess && (
            <p className={cn("mt-4 text-sm", successColors.text)}>
              {t(
                "billing.checkoutSuccessBanner",
                "Cảm ơn bạn đã nâng cấp! Nếu Pro chưa hiện ngay, đợi webhook Polar vài giây rồi tải lại trang.",
              )}
            </p>
          )}
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
                  <CheckIcon className={cn("h-4 w-4 shrink-0", successColors.icon)} />
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
                  <CheckIcon className={cn("h-4 w-4 shrink-0", successColors.icon)} />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
              <Button
                className="w-full mt-4"
                disabled={isPro || isLoading || checkoutLoading}
                onClick={() => void handleUpgrade()}
              >
                {isPro
                  ? t("billing.alreadyPro", "Đang dùng Pro")
                  : checkoutLoading
                    ? t("billing.checkoutLoading", "Đang chuyển…")
                    : t("billing.upgradeToPro", "Nâng cấp lên Pro")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
