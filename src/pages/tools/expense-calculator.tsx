import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setSeoMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

export default function ExpenseCalculator() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState<string>("");
  const [people, setPeople] = useState<string>("2");
  const [ratioMode, setRatioMode] = useState(false);
  const [ratios, setRatios] = useState<string[]>(["1", "1"]);
  const [currency, setCurrency] = useState("VND");

  useEffect(() => {
    setSeoMeta({
      title: t("tools.calculator.seoTitle", "FairPay — Chia tiền miễn phí"),
      description: t("tools.calculator.seoDescription", "Tính toán chia tiền nhanh chóng và dễ dàng với FairPay"),
      ogTitle: t("tools.calculator.seoTitle", "FairPay — Chia tiền miễn phí"),
      ogDescription: t("tools.calculator.seoDescription", "Tính toán chia tiền nhanh chóng và dễ dàng với FairPay"),
      ogUrl: window.location.href,
    });
  }, [t]);

  const totalAmount = parseFloat(amount) || 0;
  const numPeople = Math.max(2, Math.min(20, parseInt(people) || 2));

  const computedShares = (() => {
    if (totalAmount <= 0 || numPeople < 2) return [];
    if (!ratioMode) {
      const share = totalAmount / numPeople;
      return Array.from({ length: numPeople }, (_, i) => ({ label: `Person ${i + 1}`, amount: share }));
    }
    const ratioNums = ratios.slice(0, numPeople).map((r) => parseFloat(r) || 1);
    const totalRatio = ratioNums.reduce((a, b) => a + b, 0);
    return ratioNums.map((r, i) => ({ label: `Person ${i + 1}`, amount: (r / totalRatio) * totalAmount }));
  })();

  const handlePeopleChange = (val: string) => {
    setPeople(val);
    const n = parseInt(val) || 2;
    setRatios((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("1");
      return next.slice(0, n);
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">FairPay</Link>
          <Button asChild size="sm">
            <Link to="/login">{t("tools.calculator.signIn", "Đăng nhập")}</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10 flex-1">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{t("tools.calculator.title", "Chia tiền miễn phí")}</h1>
          <p className="text-muted-foreground">{t("tools.calculator.subtitle", "Tính toán chia tiền tức thì — không cần đăng nhập")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("tools.calculator.inputTitle", "Nhập thông tin")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("tools.calculator.totalAmount", "Tổng tiền")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="border rounded-md px-2 text-sm bg-background"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("tools.calculator.numberOfPeople", "Số người")} ({numPeople})</Label>
                <Input
                  type="number"
                  min="2"
                  max="20"
                  value={people}
                  onChange={(e) => handlePeopleChange(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ratio-mode"
                  checked={ratioMode}
                  onChange={(e) => setRatioMode(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="ratio-mode" className="cursor-pointer font-normal">
                  {t("tools.calculator.splitByRatio", "Chia theo tỉ lệ")}
                </Label>
              </div>

              {ratioMode && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t("tools.calculator.ratios", "Tỉ lệ từng người")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: numPeople }).map((_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground w-16">Person {i + 1}</span>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={ratios[i] ?? "1"}
                          onChange={(e) => {
                            const next = [...ratios];
                            next[i] = e.target.value;
                            setRatios(next);
                          }}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("tools.calculator.result", "Kết quả")}</CardTitle>
                {totalAmount > 0 && (
                  <CardDescription>
                    {t("tools.calculator.totalLabel", "Tổng")}: {fmt(totalAmount)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {computedShares.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("tools.calculator.enterAmount", "Nhập số tiền để xem kết quả")}</p>
                ) : (
                  <div className="space-y-2">
                    {computedShares.map((share, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="text-sm font-medium">{share.label}</span>
                        <span className={cn("text-sm font-bold", "text-primary")}>{fmt(share.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {computedShares.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <p className="text-sm text-center mb-3">
                    {t("tools.calculator.saveCta", "Lưu và theo dõi khoản chia tiền này với FairPay")}
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/register">
                      {t("tools.calculator.saveButton", "Lưu vào FairPay — Miễn phí")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© 2026 FairPay · <Link to="/" className="hover:underline">fairpay.app</Link></p>
      </footer>
    </div>
  );
}
