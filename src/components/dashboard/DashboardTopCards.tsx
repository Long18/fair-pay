import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Wallet, AlertCircle } from "lucide-react";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardTopCardsProps {
  disabled?: boolean;
}

export function DashboardTopCards({ disabled = false }: DashboardTopCardsProps) {
  const globalBalance = useGlobalBalance();
  const { t } = useTranslation();

  const totalOwed = Math.abs(globalBalance.total_i_owe);
  const totalOwedToMe = globalBalance.total_owed_to_me;
  const netBalance = totalOwedToMe - totalOwed;
  const percentage = totalOwed + totalOwedToMe > 0
    ? Math.round((totalOwedToMe / (totalOwed + totalOwedToMe)) * 100)
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

      {/* 1. Statistics Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-muted/20 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
              <path className="text-primary stroke-current" strokeDasharray={`${percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="absolute text-sm font-bold">{percentage}%</span>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-2xl font-bold tracking-tight">₫{formatCurrency(totalOwedToMe)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{t('dashboard.totalSettled')}</div>
            <div className="text-xs text-muted-foreground">of ₫{formatCurrency(totalOwed + totalOwedToMe)}</div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Plan/Action Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium leading-none">{t('dashboard.nextSettlement')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard.pendingActions')}</p>
              </div>
            </div>
            {totalOwed > 0 && <AlertCircle className="h-4 w-4 text-orange-500" />}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button size="sm" className="w-full font-medium" disabled={disabled}>{t('dashboard.settleUp')}</Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">{t('dashboard.loginToSettleUp')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button size="sm" variant="outline" className="w-full" disabled={disabled}>{t('dashboard.remind')}</Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">{t('dashboard.loginToSendReminders')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* 3. Highlight Card (Net Balance) */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ArrowUpRight className="h-24 w-24 text-primary" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{t('dashboard.yourNetBalance')}</p>
            <h3 className="text-4xl font-bold tracking-tighter">
              {netBalance >= 0 ? '+' : ''}₫{formatCurrency(netBalance)}
            </h3>
            <p className="text-xs text-muted-foreground">
              {netBalance > 0
                ? t('dashboard.youAreOwedOverall')
                : netBalance < 0
                ? t('dashboard.youOweOverall')
                : t('dashboard.allSettled')
              }
            </p>
          </div>
          <div className="mt-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button className="w-full shadow-sm" size="sm" disabled={disabled}>
                      {netBalance > 0 ? t('dashboard.requestAll') : t('dashboard.settleUp')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">{t('dashboard.loginToManagePayments')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
