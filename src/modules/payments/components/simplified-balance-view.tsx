import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSimplifiedBalances, useMySimplifiedDebts } from "../hooks/use-simplified-balances";
import { UserBalance } from "../types";

interface SimplifiedBalanceViewProps {
  balances: UserBalance[];
  currentUserId: string;
  simplifyDebts: boolean;
  onSettleUp?: (toUserId: string, amount: number) => void;
  currency?: string;
}

export const SimplifiedBalanceView = ({
  balances,
  currentUserId,
  simplifyDebts,
  onSettleUp,
  currency = "VND",
}: SimplifiedBalanceViewProps) => {
  const simplifiedBalances = useSimplifiedBalances({
    balances,
    simplify: simplifyDebts,
  });

  const { iOwe, owesMe } = useMySimplifiedDebts(simplifiedBalances, currentUserId);

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString("vi-VN")} ${currency}`;
  };

  const totalIOwe = iOwe.reduce((sum, debt) => sum + debt.amount, 0);
  const totalOwedToMe = owesMe.reduce((sum, debt) => sum + debt.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  return (
    <div className="space-y-6">
      {/* Simplification Info Banner */}
      {simplifyDebts && simplifiedBalances.transactionsSaved > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  Debts Simplified
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {simplifiedBalances.transactionsSaved} transaction
                  {simplifiedBalances.transactionsSaved !== 1 ? "s" : ""} eliminated.
                  The payments below represent the most efficient way to settle all debts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">You are owed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(totalOwedToMe)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">You owe</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Net balance</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  netBalance > 0
                    ? "text-green-600"
                    : netBalance < 0
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {netBalance > 0 ? "+" : ""}
                {formatCurrency(netBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments I Need to Make */}
      {iOwe.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">You Need to Pay</CardTitle>
              {simplifyDebts && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="cursor-help">
                        Simplified
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        These are the optimal payments to settle all your debts.
                        Individual expense details are preserved.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {iOwe.map((debt) => (
                <div
                  key={debt.to_user_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {debt.to_user_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm text-muted-foreground">You</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{debt.to_user_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600">
                        {formatCurrency(debt.amount)}
                      </div>
                    </div>
                  </div>
                  {onSettleUp && (
                    <Button
                      onClick={() => onSettleUp(debt.to_user_id, debt.amount)}
                      variant="default"
                      size="sm"
                      className="ml-4"
                    >
                      Settle Up
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments I Will Receive */}
      {owesMe.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">You Will Receive</CardTitle>
              {simplifyDebts && (
                <Badge variant="secondary">Simplified</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {owesMe.map((debt) => (
                <div
                  key={debt.from_user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {debt.from_user_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-medium">{debt.from_user_name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">You</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(debt.amount)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-4">
                    Waiting
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Settled */}
      {iOwe.length === 0 && owesMe.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-lg font-medium text-green-600">
                All settled up!
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                No outstanding balances. Everyone has paid their share.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
