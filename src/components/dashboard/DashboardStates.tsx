import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center py-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 xl:col-span-4">
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="lg:col-span-7 xl:col-span-8">
          <Skeleton className="h-64 w-full" />
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

  const handleClick = () => {
    if (disabled) {
      go({ to: "/login" });
    } else {
      go({ to: "/expenses/create" });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10">
      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
        <FilePlus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{t('dashboard.noRecentActivity')}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        {disabled
          ? t('dashboard.loginToAddExpense')
          : t('dashboard.allSettledUpNoDebts')
        }
      </p>
      <Button onClick={handleClick}>
        {disabled ? t('dashboard.loginToGetStarted') : t('dashboard.addExpense')}
      </Button>
    </div>
  );
}
