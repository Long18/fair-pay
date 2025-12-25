import { useState, useMemo, useCallback } from "react";
import { CrudFilters } from "@refinedev/core";
import { ExpenseFilters, ActiveFilter, DateFilterOption } from "./types";
import { startOfToday, startOfWeek, startOfMonth, subDays, format } from "date-fns";

export const useExpenseFilters = (initialFilters?: ExpenseFilters) => {
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters || {});

  const getDateRange = (option: DateFilterOption, customStart?: string, customEnd?: string) => {
    const today = new Date();

    switch (option) {
      case 'today':
        return {
          start: format(startOfToday(), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'this_week':
        return {
          start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'this_month':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'last_30_days':
        return {
          start: format(subDays(today, 30), 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          start: customStart || format(today, 'yyyy-MM-dd'),
          end: customEnd || format(today, 'yyyy-MM-dd'),
        };
      default:
        return null;
    }
  };

  const crudFilters = useMemo((): CrudFilters => {
    const conditions: CrudFilters = [];

    // Date range filter
    if (filters.dateRange) {
      const dateRange = getDateRange(
        filters.dateRange.option,
        filters.dateRange.startDate,
        filters.dateRange.endDate
      );

      if (dateRange) {
        conditions.push({
          field: 'expense_date',
          operator: 'gte',
          value: dateRange.start,
        });
        conditions.push({
          field: 'expense_date',
          operator: 'lte',
          value: dateRange.end,
        });
      }
    }

    // Amount range filter
    if (filters.amountRange) {
      if (filters.amountRange.min !== undefined) {
        conditions.push({
          field: 'amount',
          operator: 'gte',
          value: filters.amountRange.min,
        });
      }
      if (filters.amountRange.max !== undefined) {
        conditions.push({
          field: 'amount',
          operator: 'lte',
          value: filters.amountRange.max,
        });
      }
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      conditions.push({
        field: 'category',
        operator: 'in',
        value: filters.categories,
      });
    }

    // Paid by filter
    if (filters.paidBy && filters.paidBy.length > 0) {
      conditions.push({
        field: 'paid_by_user_id',
        operator: 'in',
        value: filters.paidBy,
      });
    }

    // Context filter (group or friendship)
    if (filters.contextId && filters.contextType) {
      if (filters.contextType === 'group') {
        conditions.push({
          field: 'group_id',
          operator: 'eq',
          value: filters.contextId,
        });
      } else if (filters.contextType === 'friend') {
        conditions.push({
          field: 'friendship_id',
          operator: 'eq',
          value: filters.contextId,
        });
      }
    }

    return conditions;
  }, [filters]);

  const activeFilters = useMemo((): ActiveFilter[] => {
    const active: ActiveFilter[] = [];

    if (filters.dateRange) {
      const labels: Record<DateFilterOption, string> = {
        today: 'Today',
        this_week: 'This Week',
        this_month: 'This Month',
        last_30_days: 'Last 30 Days',
        custom: 'Custom Range',
      };

      active.push({
        key: 'dateRange',
        label: 'Date',
        value: labels[filters.dateRange.option],
      });
    }

    if (filters.amountRange) {
      const parts: string[] = [];
      if (filters.amountRange.min !== undefined) {
        parts.push(`≥${filters.amountRange.min.toLocaleString('vi-VN')}`);
      }
      if (filters.amountRange.max !== undefined) {
        parts.push(`≤${filters.amountRange.max.toLocaleString('vi-VN')}`);
      }
      if (parts.length > 0) {
        active.push({
          key: 'amountRange',
          label: 'Amount',
          value: parts.join(' - '),
        });
      }
    }

    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach((category) => {
        active.push({
          key: `category_${category}`,
          label: 'Category',
          value: category,
        });
      });
    }

    if (filters.paidBy && filters.paidBy.length > 0) {
      active.push({
        key: 'paidBy',
        label: 'Paid By',
        value: `${filters.paidBy.length} selected`,
      });
    }

    return active;
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<ExpenseFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters((prev) => {
      const updated = { ...prev };

      if (key === 'dateRange') {
        delete updated.dateRange;
      } else if (key === 'amountRange') {
        delete updated.amountRange;
      } else if (key.startsWith('category_')) {
        const category = key.replace('category_', '');
        updated.categories = updated.categories?.filter((c) => c !== category);
        if (updated.categories?.length === 0) {
          delete updated.categories;
        }
      } else if (key === 'paidBy') {
        delete updated.paidBy;
      }

      return updated;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      contextId: filters.contextId,
      contextType: filters.contextType,
    });
  }, [filters.contextId, filters.contextType]);

  const hasActiveFilters = useMemo(() => {
    return activeFilters.length > 0;
  }, [activeFilters]);

  return {
    filters,
    crudFilters,
    activeFilters,
    hasActiveFilters,
    updateFilters,
    removeFilter,
    clearAllFilters,
  };
};
