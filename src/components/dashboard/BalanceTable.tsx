import { useState, useMemo } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/utils";

interface Balance {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: string | number;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface BalanceTableProps {
  balances: Balance[];
  pageSize?: number;
  disabled?: boolean;
  showHistory?: boolean;
}

export function BalanceTable({ balances, pageSize = 10, disabled = false, showHistory = false }: BalanceTableProps) {
  const go = useGo();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.abs(value));
  };

  // Calculate pagination
  const totalItems = balances.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBalances = useMemo(() => {
    return balances.slice(startIndex, endIndex);
  }, [balances, startIndex, endIndex]);

  const metadata: PaginationMetadata = {
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

  if (balances.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {t('dashboard.allSettledUpNoDebts', 'All settled up!')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>{t('profile.person', 'Person')}</TableHead>
            <TableHead>{t('profile.status', 'Status')}</TableHead>
            {showHistory && (
              <>
                <TableHead className="text-right">{t('dashboard.totalAmount', 'Total')}</TableHead>
                <TableHead className="text-right">{t('dashboard.settledAmount', 'Settled')}</TableHead>
              </>
            )}
            <TableHead className="text-right">
              {showHistory ? t('dashboard.remainingAmount', 'Remaining') : t('profile.amount', 'Amount')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedBalances.map((balance, index) => (
            <TableRow
              key={balance.counterparty_id}
              className={cn(
                "cursor-pointer",
                index % 2 === 0 && "bg-muted/50 dark:bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && go({ to: `/profile/${balance.counterparty_id}` })}
            >
              <TableCell>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={balance.counterparty_avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {balance.counterparty_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{balance.counterparty_name}</TableCell>
              <TableCell>
                <Badge variant={balance.i_owe_them ? "default" : "secondary"}>
                  {balance.i_owe_them ? t('dashboard.youOwe') : t('dashboard.userOwesYou')}
                </Badge>
              </TableCell>
              {showHistory && (
                <>
                  <TableCell className="text-right text-muted-foreground">
                    ₫{formatCurrency(Number(balance.total_amount || balance.amount))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    ₫{formatCurrency(Number(balance.settled_amount || 0))}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right font-semibold">
                ₫{formatCurrency(Number(showHistory ? (balance.remaining_amount || balance.amount) : balance.amount))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <PaginationControls
          metadata={metadata}
          onPageChange={handlePageChange}
          showFirstLast={true}
          maxVisiblePages={5}
        />
      )}
    </div>
  );
}
