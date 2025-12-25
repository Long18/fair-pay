import { useList, useGo } from "@refinedev/core";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { ExpenseWithSplits } from "../types";
import { CategoryIcon } from "./category-icon";
import { formatDateShort, formatNumber } from "@/lib/locale-utils";
import {
  ExpenseFiltersPanel,
  FilterChip,
  useExpenseFilters,
} from "@/components/filters";

interface ExpenseListProps {
  groupId?: string;
  friendshipId?: string;
  members?: Array<{ id: string; full_name: string }>;
}

export const ExpenseList = ({ groupId, friendshipId, members = [] }: ExpenseListProps) => {
  const go = useGo();

  const contextType = groupId ? 'group' : friendshipId ? 'friend' : undefined;
  const contextId = groupId || friendshipId;

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
    meta: {
      select: "*, profiles!paid_by_user_id(id, full_name, avatar_url)",
    },
    sorters: [
      {
        field: "expense_date",
        order: "desc",
      },
    ],
  });

  const { data, isLoading } = query;
  const expenses = data?.data || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading expenses...</div>;
  }

  return (
    <div className="space-y-4">
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
              <X className="h-3 w-3 mr-1" />
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
                <Avatar className="h-10 w-10">
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
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
