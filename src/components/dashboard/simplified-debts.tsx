import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/locale-utils";
import { useGo } from "@refinedev/core";
import { AggregatedDebt } from "@/hooks/use-aggregated-debts";

import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
interface SimplifiedDebtsProps {
  debts: AggregatedDebt[];
  isLoading?: boolean;
}

/**
 * SimplifiedDebts - Shows aggregated view of who owes whom
 * Replaces hundreds of small transactions with clear, actionable debt items
 */
export const SimplifiedDebts: React.FC<SimplifiedDebtsProps> = ({
  debts,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const go = useGo();

  if (isLoading) {
    return (
      <Card className="border-[#F2F2F2]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#333]">
            {t('dashboard.whoOwesWhom')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (debts.length === 0) {
    return (
      <Card className="border-[#F2F2F2]">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#333]">
            {t('dashboard.whoOwesWhom')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-[#6FCF97]/10 flex items-center justify-center">
                <CheckIcon className="h-8 w-8 text-[#6FCF97]" />
              </div>
            </div>
            <p className="text-[#828282]">
              {t('dashboard.allSettledUpNoDebts')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#F2F2F2]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-[#333]">
          {t('dashboard.whoOwesWhom')}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => go({ to: "/balances" })}
          className="text-[#FFA14E] hover:text-[#FF8C2E]"
        >
          {t('dashboard.viewAll')}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {debts.slice(0, 5).map((debt) => (
            <div
              key={debt.counterparty_id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[#F9F9F9] transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={debt.counterparty_avatar_url || undefined} alt={debt.counterparty_name} />
                  <AvatarFallback className="bg-[#FFA14E] text-white text-sm">
                    {debt.counterparty_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#333] truncate">
                    {debt.i_owe_them ? (
                      <>{t('dashboard.youOweUser')} <span className="font-bold">{debt.counterparty_name}</span></>
                    ) : (
                      <><span className="font-bold">{debt.counterparty_name}</span> {t('dashboard.userOwesYou')}</>
                    )}
                  </p>
                  <p className="text-xs text-[#828282] mt-0.5">
                    {t('dashboard.tapToSettleUp')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold",
                    debt.i_owe_them
                      ? "text-[#EB5757] border-[#EB5757]/20 bg-[#EB5757]/5"
                      : "text-[#6FCF97] border-[#6FCF97]/20 bg-[#6FCF97]/5"
                  )}
                >
                  {formatNumber(debt.amount)} ₫
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-[#828282] hover:text-[#FFA14E]"
                  onClick={() => {
                    // Navigate to settle-up with this user
                    go({
                      to: `/payments/create?userId=${debt.counterparty_id}&amount=${debt.amount}`,
                    });
                  }}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {debts.length > 5 && (
          <Button
            variant="outline"
            className="w-full mt-4 border-[#F2F2F2] text-[#828282] hover:text-[#FFA14E] hover:border-[#FFA14E]"
            onClick={() => go({ to: "/balances" })}
          >
            {t('dashboard.viewMore', { count: debts.length - 5 })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
