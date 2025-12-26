import { PlusCircle, Banknote, Users, UserPlus, ChevronRight } from "lucide-react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardActionsListProps {
  disabled?: boolean;
}

export function DashboardActionsList({ disabled = false }: DashboardActionsListProps) {
  const go = useGo();
  const { t } = useTranslation();

  const actions = [
    { icon: PlusCircle, title: t('dashboard.addExpense'), desc: t('dashboard.recordNewExpense'), path: "/expenses/create" },
    { icon: Banknote, title: t('dashboard.settleUp'), desc: t('dashboard.recordPaymentToSettle'), path: "/payments/create" },
    { icon: Users, title: t('dashboard.createGroup'), desc: t('dashboard.startNewExpenseGroup'), path: "/groups/create" },
    { icon: UserPlus, title: t('dashboard.inviteFriend'), desc: t('dashboard.addFriendsToSplit'), path: "/friends" },
  ];

  const handleClick = (path: string) => {
    if (disabled) {
      go({ to: "/login" });
    } else {
      go({ to: path });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{t('dashboard.quickActions')}</h3>
      <div className="grid gap-3">
        <TooltipProvider delayDuration={0}>
          {actions.map((action, i) => (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleClick(action.path)}
                  disabled={disabled}
                  className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none">{action.title}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                </button>
              </TooltipTrigger>
              {disabled && (
                <TooltipContent side="right" className="font-medium text-xs">
                  {t('dashboard.loginToUseFeature')}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
