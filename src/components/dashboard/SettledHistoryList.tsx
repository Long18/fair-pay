import { useMemo, useState } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { CheckIcon, HistoryIcon, SearchIcon } from "@/components/ui/icons";
import { PaymentStateBadge } from "@/components/ui/payment-state-badge";
import { getPaymentStateColors } from "@/lib/status-colors";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/locale-utils";

interface SettledDebt {
  counterparty_id: string;
  counterparty_name: string;
  counterparty_avatar_url?: string | null;
  amount: string | number;
  currency?: string;
  i_owe_them: boolean;
  total_amount?: number;
  settled_amount?: number;
  remaining_amount?: number;
  transaction_count?: number;
  last_transaction_date?: string;
}

interface SettledHistoryListProps {
  debts: SettledDebt[];
  isLoading?: boolean;
  pageSize?: number;
}

export function SettledHistoryList({ debts, isLoading = false, pageSize = 10 }: SettledHistoryListProps) {
  const go = useGo();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch {
      return "";
    }
  };

  // Filter: only settled debts (remaining = 0) + search
  const settledDebts = useMemo(() => {
    return debts
      .filter((d) => {
        const remaining = Number(d.remaining_amount ?? d.amount);
        return remaining === 0;
      })
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        return d.counterparty_name.toLowerCase().includes(searchQuery.toLowerCase());
      });
  }, [debts, searchQuery]);

  // Pagination
  const totalItems = settledDebts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDebts = useMemo(
    () => settledDebts.slice(startIndex, endIndex),
    [settledDebts, startIndex, endIndex]
  );

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

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (debts.length === 0 || settledDebts.length === 0 && !searchQuery) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HistoryIcon className="h-8 w-8" />
          </EmptyMedia>
          <EmptyTitle>
            {t("history.noSettledDebts", "No settled transactions yet")}
          </EmptyTitle>
          <EmptyDescription>
            {t("history.noSettledDebtsDescription", "When you settle debts with friends, they will appear here.")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("history.searchByName", "Search by name...")}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <HistoryIcon className="h-3.5 w-3.5" />
        <span>
          {t("history.settledCount", "{{count}} settled transaction(s)", { count: settledDebts.length })}
        </span>
      </div>

      {/* No results after search */}
      {paginatedDebts.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t("history.noResults", "No results found for \"{{query}}\"", { query: searchQuery })}
        </div>
      )}

      {/* Card list */}
      <div className="space-y-3">
        {paginatedDebts.map((debt) => (
          <Card
            key={debt.counterparty_id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => go({ to: `/profile/${debt.counterparty_id}` })}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                {/* Left: avatar + info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border-2 border-border">
                      <AvatarImage src={debt.counterparty_avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                        {debt.counterparty_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn("absolute -bottom-1 -right-1 rounded-full p-0.5", getPaymentStateColors("paid").bg)}>
                      <CheckIcon className={cn("h-3 w-3", getPaymentStateColors("paid").icon)} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="typography-row-title truncate">{debt.counterparty_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <PaymentStateBadge state="paid" size="sm" />
                      <Badge variant="outline" className="text-xs">
                        {debt.transaction_count || 0} {t("dashboard.transactions", "Txns")}
                      </Badge>
                      {debt.last_transaction_date && (
                        <span className="typography-metadata">
                          {formatDate(debt.last_transaction_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: amount */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="typography-amount text-muted-foreground">
                    {t("history.totalTransacted", "Total")}
                  </span>
                  <span className="typography-amount-prominent text-foreground">
                    {formatCurrency(Number(debt.total_amount || debt.amount), debt.currency || "VND")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
