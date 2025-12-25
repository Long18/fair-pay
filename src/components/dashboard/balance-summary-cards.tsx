import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Wallet } from "lucide-react";
import { formatCurrency as formatCurrencyUtil } from "@/lib/locale-utils";

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
    return formatCurrencyUtil(amount, currency);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Owed to Me */}
      <Card className="border-gray-100 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-50 rounded-xl">
              <ArrowDown className="h-6 w-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">You are owed</p>
              <p className="text-2xl font-bold text-teal-600 mt-1">
                {formatCurrency(totalOwedToMe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total I Owe */}
      <Card className="border-gray-100 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <ArrowUp className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">You owe</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Balance */}
      <Card className="border-gray-100 hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${
              netBalance >= 0 ? "bg-purple-50" : "bg-orange-50"
            }`}>
              <Wallet className={`h-6 w-6 ${
                netBalance >= 0 ? "text-purple-600" : "text-orange-600"
              }`} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 font-medium">Net balance</p>
              <p className={`text-2xl font-bold mt-1 ${
                netBalance >= 0 ? "text-purple-600" : "text-orange-600"
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
