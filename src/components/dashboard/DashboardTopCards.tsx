import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGlobalBalance } from "@/hooks/use-global-balance";
import { ArrowUpRightIcon, WalletIcon, AlertCircleIcon } from "@/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface DashboardTopCardsProps {
  disabled?: boolean;
}

export function DashboardTopCards({ disabled = false }: DashboardTopCardsProps) {
  const { t } = useTranslation();
  const globalBalance = useGlobalBalance();

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
    <div className="bento-grid mb-8">

      {/* 1. Statistics Card */}
      <Card className="bento-item shadow-sm">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-muted/20 stroke-current" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" />
              <path className="text-primary stroke-current" strokeDasharray={`${percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span className="absolute text-sm font-bold">{percentage}%</span>
          </div>
          <div className="space-y-1 text-right">
            <div className="typography-amount-large">₫{formatCurrency(totalOwedToMe)}</div>
            <div className="typography-metadata uppercase tracking-wider font-semibold">Total Settled</div>
            <div className="typography-metadata">of ₫{formatCurrency(totalOwed + totalOwedToMe)}</div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Plan/Action Card */}
      <Card className="bento-item shadow-sm">
        <CardContent className="p-6 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <WalletIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="typography-card-title">Next Settlement</p>
                <p className="typography-metadata mt-1">Pending actions</p>
              </div>
            </div>
            {totalOwed > 0 && <AlertCircleIcon className="h-4 w-4 text-orange-500" />}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button size="sm" className="w-full font-medium" disabled={disabled}>Settle Up</Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">Login to settle up</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button size="sm" variant="outline" className="w-full" disabled={disabled}>Remind</Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">Login to send reminders</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* 3. Highlight Card (Net Balance) */}
      <Card className="bento-item bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ArrowUpRightIcon className="h-24 w-24 text-primary" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="space-y-2">
            <p className="typography-card-title text-primary">Your Net Balance</p>
            <h3 className="text-4xl font-bold tracking-tighter tabular-nums">
              {netBalance >= 0 ? '+' : ''}₫{formatCurrency(netBalance)}
            </h3>
            <p className="typography-metadata">
              {netBalance > 0
                ? `You are owed overall`
                : netBalance < 0
                ? `You owe overall`
                : t('dashboard.cleanSlate', 'Clean slate')
              }
            </p>
          </div>
          <div className="mt-4">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full">
                    <Button className="w-full shadow-sm" size="sm" disabled={disabled}>
                      {netBalance > 0 ? 'Request All' : 'Settle Up'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {disabled && (
                  <TooltipContent>
                    <p className="text-xs">Login to manage payments</p>
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
