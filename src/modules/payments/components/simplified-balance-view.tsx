import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useSimplifiedBalances, useMySimplifiedDebts } from "../hooks/use-simplified-balances";
import { UserBalance } from "../types";
import { formatCurrency as formatCurrencyUtil } from "@/lib/locale-utils";

import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { ComparisonBanner } from "./comparison-banner";
interface SimplifiedBalanceViewProps {
  balances: UserBalance[];
  currentUserId: string;
  simplifyDebts: boolean;
  onSettleUp?: (toUserId: string, amount: number) => void;
  currency?: string;
  isLoading?: boolean;
}

export const SimplifiedBalanceView = ({
  balances,
  currentUserId,
  simplifyDebts,
  onSettleUp,
  currency = "VND",
  isLoading,
}: SimplifiedBalanceViewProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-lg">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                <div className="text-center space-y-2">
                  <Skeleton className="h-3 w-16 mx-auto" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  const simplifiedBalances = useSimplifiedBalances({
    balances,
    simplify: simplifyDebts,
  });

  const { iOwe, owesMe } = useMySimplifiedDebts(simplifiedBalances, currentUserId);

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, currency);
  };

  const totalIOwe = iOwe.reduce((sum, debt) => sum + debt.amount, 0);
  const totalOwedToMe = owesMe.reduce((sum, debt) => sum + debt.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  return (
    <div className="space-y-6">
      {/* Simplification Comparison Banner */}
      {simplifyDebts && simplifiedBalances.transactionsSaved > 0 && (
        <ComparisonBanner
          originalCount={simplifiedBalances.originalDebts.length}
          simplifiedCount={simplifiedBalances.simplifiedDebts.length}
          originalDebts={simplifiedBalances.originalDebts}
          simplifiedDebts={simplifiedBalances.simplifiedDebts}
          currency={currency === "VND" ? "₫" : currency}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="rounded-lg">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="text-center">
              <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">You are owed</p>
              <p className="text-base sm:text-2xl font-bold text-green-600 dark:text-green-400 mt-0.5 sm:mt-1 truncate">
                {formatCurrency(totalOwedToMe)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="text-center">
              <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">You owe</p>
              <p className="text-base sm:text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5 sm:mt-1 truncate">
                {formatCurrency(totalIOwe)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="text-center">
              <p className="text-[10px] sm:text-sm text-muted-foreground leading-tight">Net balance</p>
              <p
                className={`text-base sm:text-2xl font-bold mt-0.5 sm:mt-1 truncate ${
                  netBalance > 0
                    ? "text-green-600 dark:text-green-400"
                    : netBalance < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
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
                      <AvatarImage src={debt.to_user_avatar_url || undefined} alt={debt.to_user_name} />
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
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{debt.to_user_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-red-600 dark:text-red-400">
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
                      <AvatarImage src={debt.from_user_avatar_url || undefined} alt={debt.from_user_name} />
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
                      <ArrowRightIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">You</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600 dark:text-green-400">
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

      {/* All Settled - Clean State */}
      {iOwe.length === 0 && owesMe.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle2Icon className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-base font-medium tracking-tight">
                {t('dashboard.debtFreeTitle', "You're debt-free")}
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('dashboard.everyonePaidShare', 'Everyone has paid their share.')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
