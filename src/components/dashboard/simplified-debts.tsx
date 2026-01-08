import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatNumber } from "@/lib/locale-utils";
import { useGo } from "@refinedev/core";
import { AggregatedDebt } from "@/hooks/use-aggregated-debts";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";

import { ArrowRightIcon, CheckIcon, UserIcon } from "@/components/ui/icons";
interface SimplifiedDebtsProps {
  debts: AggregatedDebt[];
  isLoading?: boolean;
  pageSize?: number;
}

/**
 * SimplifiedDebts - Shows aggregated view of who owes whom
 * Replaces hundreds of small transactions with clear, actionable debt items
 */
export const SimplifiedDebts: React.FC<SimplifiedDebtsProps> = ({
  debts,
  isLoading = false,
  pageSize = 10,
}) => {
  const { t } = useTranslation();
  const go = useGo();
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalItems = debts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDebts = useMemo(() => {
    return debts.slice(startIndex, endIndex);
  }, [debts, startIndex, endIndex]);

  const paginationMetadata: PaginationMetadata = {
    totalItems,
    totalPages: totalPages || 1,
    currentPage,
    pageSize,
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold">
            {t('dashboard.whoOwesWhom')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
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
      <CardHeader>
        <CardTitle className="text-base font-bold text-[#333]">
          {t('dashboard.whoOwesWhom')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {paginatedDebts.map((debt) => (
            <div
              key={debt.counterparty_id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => {
                go({ to: `/profile/${debt.counterparty_id}` });
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  go({ to: `/profile/${debt.counterparty_id}` });
                }
              }}
              aria-label={`${debt.i_owe_them ? t('dashboard.youOweUser') : t('dashboard.userOwesYou')} ${debt.counterparty_name}, ${formatNumber(debt.amount)} ₫`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={debt.counterparty_avatar_url || undefined} alt={debt.counterparty_name} />
                  <AvatarFallback className="bg-[#FFA14E] text-white text-sm">
                    {debt.counterparty_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {debt.i_owe_them ? (
                      <>{t('dashboard.youOweUser')} <span className="font-bold">{debt.counterparty_name}</span></>
                    ) : (
                      <><span className="font-bold">{debt.counterparty_name}</span> {t('dashboard.userOwesYou')}</>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('dashboard.tapToSettleUp')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-semibold",
                    debt.i_owe_them
                      ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/10"
                      : "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/30 bg-green-50 dark:bg-green-950/10"
                  )}
                >
                  {formatNumber(debt.amount)} ₫
                </Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      go({ to: `/profile/${debt.counterparty_id}` });
                    }}
                    aria-label={t('dashboard.viewProfile', 'View profile')}
                  >
                    <UserIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      go({
                        to: `/payments/create?userId=${debt.counterparty_id}&amount=${debt.amount}`,
                      });
                    }}
                    aria-label={t('dashboard.settleUp', 'Settle up')}
                  >
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t">
            <PaginationControls
              metadata={paginationMetadata}
              onPageChange={handlePageChange}
              showFirstLast={true}
              maxVisiblePages={5}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
