import { useList, useOne } from '@refinedev/core';
import { useInstantCreate, useInstantUpdate, useInstantDelete } from '@/hooks/use-instant-mutation';
import { useMemo } from 'react';
import { RecurringExpense, RecurringExpenseFormValues, PrepaidCoverageInfo } from '../types/recurring';
import { getPrepaidCoverageStatus } from '../utils/prepaid-calculations';

/**
 * Extended recurring expense with prepaid coverage info
 */
export interface RecurringExpenseWithCoverage extends RecurringExpense {
  prepaidCoverageInfo: PrepaidCoverageInfo;
}

interface UseRecurringExpensesProps {
  groupId?: string;
  friendshipId?: string;
}

export function useRecurringExpenses({ groupId, friendshipId }: UseRecurringExpensesProps = {}) {
  const { query } = useList<RecurringExpense>({
    resource: 'recurring_expenses',
    filters: [],
    sorters: [{ field: 'next_occurrence', order: 'asc' }],
    meta: {
      select: '*, expenses:template_expense_id(*, expense_splits(*))',
    },
    pagination: {
      mode: 'off',
    },
  });

  // Map the joined 'expenses' field to 'template_expense' and add prepaid coverage info
  const recurring = useMemo(() => {
    let items = (query.data?.data || []).map((r: any) => {
      const recurringExpense: RecurringExpense = {
        ...r,
        template_expense: r.expenses, // Map expenses to template_expense
      };
      
      // Calculate prepaid coverage status
      const prepaidCoverageInfo = getPrepaidCoverageStatus(recurringExpense);
      
      return {
        ...recurringExpense,
        prepaidCoverageInfo,
      } as RecurringExpenseWithCoverage;
    });

    // Filter on client side based on the template expense's context
    if (groupId) {
      items = items.filter((r: any) =>
        r.expenses && r.expenses.group_id === groupId
      );
    }

    if (friendshipId) {
      items = items.filter((r: any) =>
        r.expenses && r.expenses.friendship_id === friendshipId
      );
    }

    return items;
  }, [query.data?.data, groupId, friendshipId]);

  const isLoading = query.isLoading;
  const error = query.error;

  const active = useMemo(() => recurring.filter((r) => r.is_active), [recurring]);
  const paused = useMemo(() => recurring.filter((r) => !r.is_active), [recurring]);

  return {
    recurring,
    active,
    paused,
    isLoading,
    error,
  };
}

export function useRecurringExpense(id: string) {
  const { query } = useOne<RecurringExpense>({
    resource: 'recurring_expenses',
    id,
    meta: {
      select: '*, expenses:template_expense_id(*, expense_splits(*))',
    },
  });

  // Add prepaid coverage info to the recurring expense
  const recurring = useMemo(() => {
    const data = query.data?.data;
    if (!data) return undefined;

    const recurringExpense: RecurringExpense = {
      ...data,
      template_expense: (data as any).expenses,
    };

    const prepaidCoverageInfo = getPrepaidCoverageStatus(recurringExpense);

    return {
      ...recurringExpense,
      prepaidCoverageInfo,
    } as RecurringExpenseWithCoverage;
  }, [query.data?.data]);

  return {
    recurring,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateRecurringExpense() {
  const { mutate } = useInstantCreate();

  const createRecurring = async (
    templateExpenseId: string,
    values: Omit<RecurringExpenseFormValues, 'is_recurring'>,
    _contextType: 'group' | 'friend',
    _contextId: string
  ) => {
    const data: any = {
      template_expense_id: templateExpenseId,
      frequency: values.frequency,
      interval: values.interval,
      next_occurrence: values.start_date.toISOString().split('T')[0],
      end_date: values.end_date ? values.end_date.toISOString().split('T')[0] : null,
      is_active: true,
    };

    return new Promise<RecurringExpense>((resolve, reject) => {
      mutate(
        {
          resource: 'recurring_expenses',
          values: data,
        },
        {
          onSuccess: (result) => resolve(result.data as RecurringExpense),
          onError: (error) => reject(error),
        }
      );
    });
  };

  return {
    createRecurring,
  };
}

export function useUpdateRecurringExpense() {
  const { mutate } = useInstantUpdate();

  const updateRecurring = async (
    id: string,
    values: Partial<RecurringExpenseFormValues & { is_active?: boolean }>
  ) => {
    const data: any = {};

    if (values.frequency !== undefined) data.frequency = values.frequency;
    if (values.interval !== undefined) data.interval = values.interval;
    if (values.end_date !== undefined) {
      data.end_date = values.end_date ? values.end_date.toISOString().split('T')[0] : null;
    }
    if (values.is_active !== undefined) {
      data.is_active = values.is_active;
    }

    return new Promise<RecurringExpense>((resolve, reject) => {
      mutate(
        {
          resource: 'recurring_expenses',
          id,
          values: data,
        },
        {
          onSuccess: (result) => resolve(result.data as RecurringExpense),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const pauseRecurring = async (id: string) => {
    return updateRecurring(id, { is_active: false });
  };

  const resumeRecurring = async (id: string) => {
    return updateRecurring(id, { is_active: true });
  };

  return {
    updateRecurring,
    pauseRecurring,
    resumeRecurring,
  };
}

export function useDeleteRecurringExpense() {
  const { mutate } = useInstantDelete();

  const deleteRecurring = async (id: string) => {
    return new Promise<void>((resolve, reject) => {
      mutate(
        {
          resource: 'recurring_expenses',
          id,
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  return {
    deleteRecurring,
  };
}
