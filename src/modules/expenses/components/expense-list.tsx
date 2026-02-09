import { useList, useGo } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExpenseWithSplits } from "../types";
import { CategoryIcon } from "./category-icon";
import { formatDateShort, formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import {
  ExpenseFiltersPanel,
  FilterChip,
  useExpenseFilters,
} from "@/components/filters";
import { PaginationControls, PaginationMetadata } from "@/components/ui/pagination-controls";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBulkDeleteExpenses } from "@/hooks/use-bulk-operations";
import { BulkActionBar } from "@/components/bulk-operations/BulkActionBar";
import { BulkDeleteDialog } from "@/components/bulk-operations/BulkDeleteDialog";

import { EyeIcon, XIcon, CheckSquareIcon, RepeatIcon } from "@/components/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseClient } from "@/utility/supabaseClient";
import { useQuery } from "@tanstack/react-query";
interface ExpenseListProps {
  groupId?: string;
  friendshipId?: string;
  members?: Array<{ id: string; full_name: string }>;
}

export const ExpenseList = ({ groupId, friendshipId, members = [] }: ExpenseListProps) => {
  const go = useGo();
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const bulkDeleteMutation = useBulkDeleteExpenses();

  const contextType = groupId ? 'group' : friendshipId ? 'friend' : undefined;
  const contextId = groupId || friendshipId;

  // Fetch recurring expense template IDs to mark recurring expenses in the list
  const { data: recurringTemplateIds } = useQuery({
    queryKey: ['recurring_template_ids', contextId],
    queryFn: async () => {
      let query = supabaseClient
        .from('recurring_expenses')
        .select('template_expense_id, frequency, interval, is_active');

      if (groupId) query = query.eq('group_id', groupId);
      else if (friendshipId) query = query.eq('friendship_id', friendshipId);

      const { data } = await query;
      // Build a Map for O(1) lookups
      const map = new Map<string, { frequency: string; interval: number; is_active: boolean }>();
      (data || []).forEach((r: any) => {
        map.set(r.template_expense_id, {
          frequency: r.frequency,
          interval: r.interval,
          is_active: r.is_active,
        });
      });
      return map;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!(groupId || friendshipId),
  });

  const {
    crudFilters,
    activeFilters,
    hasActiveFilters,
    updateFilters,
    removeFilter,
    clearAllFilters,
    filters: currentFilters,
  } = useExpenseFilters({
    contextId,
    contextType: contextType as 'group' | 'friend' | undefined,
  });

  const { query } = useList<ExpenseWithSplits>({
    resource: "expenses",
    filters: crudFilters,
    pagination: {
      mode: "off",
    },
    meta: {
      select: "*, profiles!paid_by_user_id(id, full_name, avatar_url)",
    },
    sorters: [
      {
        field: "expense_date",
        order: "desc",
      },
    ],
    queryOptions: {
      staleTime: 1 * 60 * 1000, // 1 minute - data is fresh
      gcTime: 3 * 60 * 1000, // 3 minutes - keep in cache
      refetchOnWindowFocus: false, // Don't refetch on window focus
    },
  });

  const { data, isLoading } = query;
  const allExpenses = data?.data || [];

  // Client-side pagination (with query optimization)
  const totalExpenses = allExpenses.length;
  const paginationMetadata: PaginationMetadata = {
    totalItems: totalExpenses,
    totalPages: Math.ceil(totalExpenses / pageSize),
    currentPage: currentPage,
    pageSize: pageSize,
  };

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const expenses = allExpenses.slice(startIndex, endIndex);

  // Selection handlers
  const handleToggleSelection = (expenseId: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedExpenseIds.length === expenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(expenses.map((e) => e.id).filter((id): id is string => !!id));
    }
  };

  const handleCancelSelection = () => {
    setSelectedExpenseIds([]);
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteMutation.mutateAsync(
      { expenseIds: selectedExpenseIds },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSelectedExpenseIds([]);
          setSelectionMode(false);
          query.refetch();
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading expenses...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {!selectionMode && expenses.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectionMode(true)}
            >
              <CheckSquareIcon className="h-4 w-4 mr-2" />
              Select
            </Button>
          )}
          {selectionMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedExpenseIds.length === expenses.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        <ExpenseFiltersPanel
          filters={currentFilters}
          onFiltersChange={updateFilters}
          onClearAll={clearAllFilters}
          members={members}
        />

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {activeFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                value={filter.value}
                onRemove={() => removeFilter(filter.key)}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={clearAllFilters}
            >
              <XIcon className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">Loading expenses...</div>
      )}

      {/* Empty State */}
      {!isLoading && expenses.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {hasActiveFilters
              ? "No expenses match your filters. Try adjusting or clearing them."
              : "No expenses yet. Create your first expense to get started!"}
          </CardContent>
        </Card>
      )}

      {/* Expense List */}
      {!isLoading && expenses.length > 0 && expenses.map((expense: any) => (
        <Card key={expense.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {/* Selection Checkbox */}
                {selectionMode && (
                  <Checkbox
                    checked={selectedExpenseIds.includes(expense.id)}
                    onCheckedChange={() => handleToggleSelection(expense.id)}
                  />
                )}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={expense.profiles?.avatar_url} alt={expense.profiles?.full_name} />
                  <AvatarFallback>
                    {expense.profiles?.full_name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{expense.description}</h4>
                    {expense.category && (
                      <CategoryIcon category={expense.category} size="sm" />
                    )}
                    {recurringTemplateIds?.has(expense.id) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-xs px-1.5 py-0",
                              recurringTemplateIds.get(expense.id)?.is_active
                                ? "border-blue-300 text-blue-600 bg-blue-50"
                                : "border-gray-300 text-gray-500 bg-gray-50"
                            )}
                          >
                            <RepeatIcon className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('recurring.recurringTemplate', 'Recurring template')} ({recurringTemplateIds.get(expense.id)?.is_active ? t('recurring.active') : t('recurring.paused')})</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Paid by {expense.profiles?.full_name || "Unknown"} •{" "}
                    {formatDateShort(expense.expense_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-bold text-lg">
                    {formatNumber(expense.amount)} ₫
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => go({ to: `/expenses/show/${expense.id}` })}
                >
                  <EyeIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pagination Controls */}
      {!isLoading && allExpenses.length > 0 && paginationMetadata.totalPages > 1 && (
        <div className="mt-6">
          <PaginationControls
            metadata={paginationMetadata}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedExpenseIds.length}
        onDelete={() => setDeleteDialogOpen(true)}
        onCancel={handleCancelSelection}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        selectedCount={selectedExpenseIds.length}
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
};
