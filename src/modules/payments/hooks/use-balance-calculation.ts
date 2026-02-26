import { useMemo } from "react";
import { UserBalance } from "../types";
import { ExpenseWithSplits } from "@/modules/expenses/types";
import { Payment } from "../types";

interface UseBalanceCalculationProps {
  expenses: ExpenseWithSplits[];
  payments: Payment[];
  currentUserId: string;
  members: Array<{ id: string; full_name: string; avatar_url?: string | null }>;
}

/**
 * Pure function to calculate balances (no hooks)
 * Can be called from anywhere, including inside loops/maps
 */
export const calculateBalances = (
  expenses: ExpenseWithSplits[],
  payments: Payment[],
  members: Array<{ id: string; full_name: string; avatar_url?: string | null }>
): UserBalance[] => {
    // Initialize balance for each member
    const balanceMap = new Map<string, number>();
    const memberIds = new Set<string>();
    members.forEach(member => {
      balanceMap.set(member.id, 0);
      memberIds.add(member.id);
    });

    // Include users from expenses/payments who may have been removed from the group
    expenses.forEach((expense: any) => {
      const paidBy = expense.paid_by_user_id;
      if (!memberIds.has(paidBy)) {
        balanceMap.set(paidBy, 0);
        memberIds.add(paidBy);
      }
      const splits = expense.splits || expense.expense_splits || [];
      splits.forEach((split: any) => {
        if (!memberIds.has(split.user_id)) {
          balanceMap.set(split.user_id, 0);
          memberIds.add(split.user_id);
        }
      });
    });

    payments.forEach(payment => {
      if (!memberIds.has(payment.from_user)) {
        balanceMap.set(payment.from_user, 0);
        memberIds.add(payment.from_user);
      }
      if (!memberIds.has(payment.to_user)) {
        balanceMap.set(payment.to_user, 0);
        memberIds.add(payment.to_user);
      }
    });

    // Process expenses
    expenses.forEach((expense: any) => {
      const paidBy = expense.paid_by_user_id;
      const splits = expense.splits || expense.expense_splits || [];

      // Add what this person paid
      if (balanceMap.has(paidBy)) {
        balanceMap.set(paidBy, (balanceMap.get(paidBy) || 0) + Number(expense.amount));
      }

      // Subtract what each person owes
      splits.forEach((split: any) => {
        const userId = split.user_id;
        const amount = Number(split.computed_amount);
        if (balanceMap.has(userId)) {
          balanceMap.set(userId, (balanceMap.get(userId) || 0) - amount);
        }
      });
    });

    // Process payments
    payments.forEach(payment => {
      const fromUser = payment.from_user;
      const toUser = payment.to_user;
      const amount = Number(payment.amount);

      // Person who paid reduces their balance (paid debt)
      if (balanceMap.has(fromUser)) {
        balanceMap.set(fromUser, (balanceMap.get(fromUser) || 0) - amount);
      }

      // Person who received increases their balance (received payment)
      if (balanceMap.has(toUser)) {
        balanceMap.set(toUser, (balanceMap.get(toUser) || 0) + amount);
      }
    });

    // Convert all users in balanceMap (including removed members) to UserBalance array
    const memberLookup = new Map(members.map(m => [m.id, m]));
    const balances: UserBalance[] = Array.from(balanceMap.entries()).map(([userId, balance]) => {
      const member = memberLookup.get(userId);
      return {
        user_id: userId,
        user_name: member?.full_name || "Former Member",
        avatar_url: member?.avatar_url || null,
        balance: Math.round(balance * 100) / 100,
      };
    });

    // Sort: debts first (negative), then credits (positive)
    return balances.sort((a, b) => a.balance - b.balance);
};

/**
 * Calculate balances for a group context (React Hook version)
 *
 * Formula per user:
 * balance = (total paid by user) - (total owed by user) + (payments received) - (payments made)
 *
 * Positive balance = Others owe this user
 * Negative balance = This user owes others
 *
 * Risk mitigation: Simple, straightforward calculation without debt simplification
 */
export const useBalanceCalculation = ({
  expenses,
  payments,
  currentUserId,
  members,
}: UseBalanceCalculationProps): UserBalance[] => {
  return useMemo(() => {
    return calculateBalances(expenses, payments, members);
  }, [expenses, payments, members, currentUserId]);
};

/**
 * Get individual debts from current user's perspective
 * Returns list of people current user owes or who owe them
 */
export const useMyDebts = (
  balances: UserBalance[],
  currentUserId: string
): Array<{ user: UserBalance; amount: number; type: 'owes_me' | 'i_owe' }> => {
  return useMemo(() => {
    const currentBalance = balances.find(b => b.user_id === currentUserId);
    if (!currentBalance) return [];

    // Simple approach: show direct relationships
    // Future: implement debt simplification algorithm
    return balances
      .filter(b => b.user_id !== currentUserId && b.balance !== 0)
      .map(user => {
        const myBalance = currentBalance.balance;
        const theirBalance = user.balance;

        // Determine relationship
        if (theirBalance < 0 && myBalance > 0) {
          // They owe me
          return {
            user,
            amount: Math.abs(theirBalance),
            type: 'owes_me' as const,
          };
        } else if (myBalance < 0 && theirBalance > 0) {
          // I owe them
          return {
            user,
            amount: Math.abs(myBalance),
            type: 'i_owe' as const,
          };
        }
        return null;
      })
      .filter((debt): debt is NonNullable<typeof debt> => debt !== null);
  }, [balances, currentUserId]);
};
