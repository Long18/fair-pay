import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon, TrendingDownIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/locale-utils";
import type { SimplifiedBalance } from "../hooks/use-simplified-balances";

interface ComparisonBannerProps {
  originalCount: number;
  simplifiedCount: number;
  originalDebts: SimplifiedBalance[];
  simplifiedDebts: SimplifiedBalance[];
  currency?: string;
}

export function ComparisonBanner({
  originalCount,
  simplifiedCount,
  originalDebts,
  simplifiedDebts,
  currency = "₫",
}: ComparisonBannerProps) {
  const { t } = useTranslation();

  const { transactionsSaved, reductionPercent, originalTotal, simplifiedTotal } =
    useMemo(() => {
      const saved = Math.max(0, originalCount - simplifiedCount);
      const percent =
        originalCount > 0 ? Math.round((saved / originalCount) * 100) : 0;
      const origTotal = originalDebts.reduce((sum, d) => sum + d.amount, 0);
      const simpTotal = simplifiedDebts.reduce((sum, d) => sum + d.amount, 0);
      return {
        transactionsSaved: saved,
        reductionPercent: percent,
        originalTotal: origTotal,
        simplifiedTotal: simpTotal,
      };
    }, [originalCount, simplifiedCount, originalDebts, simplifiedDebts]);

  if (transactionsSaved <= 0) return null;

  return (
    <Collapsible>
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <TrendingDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t("debts.transactionsSaved", "{{count}} transaction(s) eliminated", {
                count: transactionsSaved,
              })}
            </span>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs"
            >
              {reductionPercent}%{" "}
              {t("debts.fewer", "fewer")}
            </Badge>
          </div>
          <ChevronDownIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex justify-between text-xs text-blue-800 dark:text-blue-200">
              <span>
                {t("debts.originalTransactions", "Original")}: {originalCount}{" "}
                {t("debts.transactions", "transactions")}
              </span>
              <span>
                {formatNumber(originalTotal)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-xs text-blue-800 dark:text-blue-200">
              <span>
                {t("debts.simplifiedTransactions", "Simplified")}: {simplifiedCount}{" "}
                {t("debts.transactions", "transactions")}
              </span>
              <span>
                {formatNumber(simplifiedTotal)} {currency}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
