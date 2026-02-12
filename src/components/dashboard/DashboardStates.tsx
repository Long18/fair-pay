import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";

import { FilePlusIcon } from "@/components/ui/icons";
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
        <div className="bg-card border rounded-lg shadow-sm p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

interface DashboardEmptyStateProps {
  disabled?: boolean;
}

export function DashboardEmptyState({ disabled = false }: DashboardEmptyStateProps) {
  const go = useGo();
  const { t } = useTranslation();

  if (disabled) {
    const handleClick = () => {
      go({ to: "/login" });
    };

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
        <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
          <FilePlusIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t('dashboard.noRecentActivity')}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mb-6">
          {t('dashboard.loginToAddExpense')}
        </p>
        <Button onClick={handleClick}>
          {t('dashboard.loginToGetStarted')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl bg-gradient-to-b from-green-50/50 to-transparent dark:from-green-950/20 dark:to-transparent">
      <div className="h-16 w-16 rounded-2xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center mb-4">
        <span className="text-3xl">🎉</span>
      </div>
      <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
        {t('dashboard.congratsDebtFree', 'Chúc mừng, bạn đã hết nợ!')}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs mt-2">
        {t('dashboard.noOneOwesYou', 'Không ai đang nợ bạn và bạn cũng không nợ ai.')}
      </p>
    </div>
  );
}
