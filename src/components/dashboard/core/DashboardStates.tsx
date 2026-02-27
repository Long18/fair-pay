import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";

import { FilePlusIcon, CheckCircle2Icon } from "@/components/ui/icons";
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
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
      <div className="size-10 rounded-lg bg-muted flex items-center justify-center mb-4">
        <CheckCircle2Icon className="h-5 w-5 text-green-500" />
      </div>
      <h3 className="text-lg font-medium tracking-tight">
        {t('dashboard.debtFreeTitle', "You're debt-free")}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs mt-1">
        {t('dashboard.debtFreeDescription', "No one owes you and you don't owe anyone.")}
      </p>
    </div>
  );
}
