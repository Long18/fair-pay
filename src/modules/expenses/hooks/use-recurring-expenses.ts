import { useList, useCreate, useUpdate, useDelete, useOne } from '@refinedev/core';
import { RecurringExpense, RecurringExpenseFormValues } from '../types/recurring';

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
      select: '*, expenses:template_expense_id(*)',
    },
    pagination: {
      mode: 'off',
    },
  });

  // Map the joined 'expenses' field to 'template_expense' for compatibility
  let recurring = (query.data?.data || []).map((r: any) => ({
    ...r,
    template_expense: r.expenses, // Map expenses to template_expense
  }));

  // Filter on client side based on the template expense's context
  if (groupId) {
    recurring = recurring.filter((r: any) =>
      r.expenses && r.expenses.group_id === groupId
    );
  }

  if (friendshipId) {
    recurring = recurring.filter((r: any) =>
      r.expenses && r.expenses.friendship_id === friendshipId
    );
  }

  const isLoading = query.isLoading;
  const error = query.error;

  const active = recurring.filter((r) => r.is_active);
  const paused = recurring.filter((r) => !r.is_active);

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
      select: '*, expenses:template_expense_id(*)',
    },
  });

  return {
    recurring: query.data?.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCreateRecurringExpense() {
  const { mutate } = useCreate<RecurringExpense>();

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
  const { mutate } = useUpdate<RecurringExpense>();

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
  const { mutate } = useDelete<RecurringExpense>();

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
