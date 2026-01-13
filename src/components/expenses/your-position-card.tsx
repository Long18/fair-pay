import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/locale-utils";
import { useTranslation } from "react-i18next";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { UserIcon } from "@/components/ui/icons";

interface YourPositionCardProps {
  iOwe: number;
  iAmOwed: number;
  netPosition: number;
  currency: string;
  isSettled: boolean;
}

export function YourPositionCard({
  iOwe,
  iAmOwed,
  netPosition,
  currency,
  isSettled,
}: YourPositionCardProps) {
  const { t } = useTranslation();
  const hasDebt = iOwe > 0;
  const hasCredit = iAmOwed > 0;
  const statusColors = getOweStatusColors(hasDebt ? 'owe' : hasCredit ? 'owed' : 'neutral');

  return (
    <Card className={cn("border-2", isSettled && "bg-muted/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 typography-card-title">
          <UserIcon className="h-5 w-5" />
          {t('expense.yourPosition', 'Your Position')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasDebt && (
          <div className="flex items-center justify-between">
            <span className="typography-body text-muted-foreground">{t('expense.youOwe', 'You owe')}</span>
            <span className={cn("typography-amount-prominent", getOweStatusColors('owe').text)}>
              {formatCurrency(iOwe, currency)}
            </span>
          </div>
        )}
        {hasCredit && (
          <div className="flex items-center justify-between">
            <span className="typography-body text-muted-foreground">{t('expense.youAreOwed', 'You are owed')}</span>
            <span className={cn("typography-amount-prominent", getOweStatusColors('owed').text)}>
              {formatCurrency(iAmOwed, currency)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="typography-row-title">{t('expense.netForThisExpense', 'Net for this expense')}</span>
          <div className="flex items-center gap-2">
            {isSettled && (
              <Badge variant="outline" className="text-xs">
                {t('status.settled', 'Settled')}
              </Badge>
            )}
            <span className={cn("typography-amount-large", statusColors.text)}>
              {netPosition >= 0 ? '+' : ''}{formatCurrency(netPosition, currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
