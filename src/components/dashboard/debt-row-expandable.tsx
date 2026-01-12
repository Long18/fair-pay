import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronRightIcon, UserIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/locale-utils";
import { getOweStatusColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useGo } from "@refinedev/core";
import { format } from "date-fns";
import { ContributingExpensesList } from "./contributing-expenses-list";
import { useContributingExpenses } from "@/hooks/use-contributing-expenses";
import { motion, AnimatePresence } from "framer-motion";

interface DebtRowExpandableProps {
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAvatarUrl?: string | null;
  amount: number;
  currency: string;
  iOweThem: boolean;
  transactionCount?: number;
  lastTransactionDate?: string;
}

export function DebtRowExpandable({
  counterpartyId,
  counterpartyName,
  counterpartyAvatarUrl,
  amount,
  currency,
  iOweThem,
  transactionCount,
  lastTransactionDate,
}: DebtRowExpandableProps) {
  const { t } = useTranslation();
  const go = useGo();
  const [isExpanded, setIsExpanded] = useState(false);
  const { expenses, isLoading } = useContributingExpenses(counterpartyId);

  const statusColors = iOweThem ? getOweStatusColors('owe') : getOweStatusColors('owed');

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return '';
    }
  };

  const handleRowClick = () => {
    if (isExpanded) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card transition-shadow hover:shadow-md">
      {/* Main Row - Clickable to expand */}
      <div
        onClick={handleRowClick}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={counterpartyAvatarUrl || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {counterpartyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="typography-row-title truncate">
              {counterpartyName}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge
                variant={iOweThem ? "default" : "secondary"}
                className="text-xs"
              >
                {iOweThem ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
              </Badge>
              {transactionCount !== undefined && (
                <>
                  <span className="typography-metadata">•</span>
                  <span className="typography-metadata">
                    {transactionCount} {t('dashboard.expenses', 'expenses')}
                  </span>
                </>
              )}
              {lastTransactionDate && (
                <>
                  <span className="typography-metadata">•</span>
                  <span className="typography-metadata">
                    {t('dashboard.last', 'Last')}: {formatDate(lastTransactionDate)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span className={cn("typography-amount-prominent", statusColors.text)}>
            {iOweThem ? '-' : '+'}
            {formatCurrency(Math.abs(amount), currency)}
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDownIcon className="h-5 w-5 text-muted-foreground shrink-0" />
          </motion.div>
        </div>
      </div>

      {/* Expanded View - Contributing Expenses */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t bg-muted/10 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="typography-card-title">
                  {t('dashboard.contributingExpenses', 'Contributing Expenses')}
                </h4>
              </div>

              <ContributingExpensesList
                expenses={expenses}
                counterpartyId={counterpartyId}
                isLoading={isLoading}
              />

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    go({ to: `/debts/${counterpartyId}` });
                  }}
                >
                  {t('dashboard.viewFullBreakdown', 'View Full Breakdown')}
                  <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    go({ to: `/profile/${counterpartyId}` });
                  }}
                >
                  <UserIcon className="h-4 w-4 mr-1" />
                  {t('profile.view', 'Profile')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
