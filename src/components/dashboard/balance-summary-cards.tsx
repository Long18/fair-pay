import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";

interface BalanceSummaryCardsProps {
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  currency?: string;
}

export const BalanceSummaryCards = ({
  totalOwedToMe,
  totalIOwe,
  netBalance,
  currency = "VND",
}: BalanceSummaryCardsProps) => {
  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString("vi-VN")} ${currency}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Owed to Me */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <ArrowDown className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">You are owed</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalOwedToMe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total I Owe */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <ArrowUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">You owe</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${
              netBalance >= 0 ? "bg-blue-100" : "bg-orange-100"
            }`}>
              <Wallet className={`h-6 w-6 ${
                netBalance >= 0 ? "text-blue-600" : "text-orange-600"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Net balance</p>
              <p className={`text-2xl font-bold ${
                netBalance >= 0 ? "text-blue-600" : "text-orange-600"
              }`}>
                {netBalance >= 0 ? "+" : ""}{formatCurrency(netBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
