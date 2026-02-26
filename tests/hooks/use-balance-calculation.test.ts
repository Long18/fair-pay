import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBalanceCalculation, useMyDebts } from '@/modules/payments/hooks/use-balance-calculation';
import { ExpenseWithSplits } from '@/modules/expenses/types';
import { Payment } from '@/modules/payments/types';

describe('useBalanceCalculation', () => {
  const mockMembers = [
    { id: 'user-1', full_name: 'Alice', avatar_url: null },
    { id: 'user-2', full_name: 'Bob', avatar_url: null },
    { id: 'user-3', full_name: 'Charlie', avatar_url: null },
  ];

  describe('Basic Balance Calculation', () => {
    it('should initialize all balances to zero', () => {
      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses: [],
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      expect(result.current).toHaveLength(3);
      result.current.forEach(balance => {
        expect(balance.balance).toBe(0);
      });
    });

    it('should calculate balance when user pays for expense', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      const bobBalance = result.current.find(b => b.user_id === 'user-2');

      expect(aliceBalance?.balance).toBe(50); // Paid 100, owes 50 = +50
      expect(bobBalance?.balance).toBe(-50); // Owes 50
    });

    it('should handle multiple expenses correctly', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        } as any,
        {
          id: 'exp-2',
          paid_by_user_id: 'user-2',
          amount: 60,
          splits: [
            { user_id: 'user-1', computed_amount: 30 },
            { user_id: 'user-2', computed_amount: 30 },
          ],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      const bobBalance = result.current.find(b => b.user_id === 'user-2');

      expect(aliceBalance?.balance).toBe(20); // Paid 100, owes 50+30 = +20
      expect(bobBalance?.balance).toBe(-20); // Paid 60, owes 50+30 = -20
    });
  });

  describe('Payment Processing', () => {
    it('should reduce balance when payment is made', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        } as any,
      ];

      const payments: Payment[] = [
        {
          id: 'pay-1',
          from_user: 'user-2',
          to_user: 'user-1',
          amount: 50,
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments,
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      const bobBalance = result.current.find(b => b.user_id === 'user-2');

      // Alice: Paid 100, owes 50 = +50, received 50 = +100
      // Bob: Owes 50, paid 50 = -50 - 50 = -100
      // Note: Payment logic adds to receiver, subtracts from payer
      expect(aliceBalance?.balance).toBe(100);
      expect(bobBalance?.balance).toBe(-100);
    });

    it('should handle multiple payments correctly', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        } as any,
      ];

      const payments: Payment[] = [
        {
          id: 'pay-1',
          from_user: 'user-2',
          to_user: 'user-1',
          amount: 30,
        } as any,
        {
          id: 'pay-2',
          from_user: 'user-2',
          to_user: 'user-1',
          amount: 20,
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments,
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      const bobBalance = result.current.find(b => b.user_id === 'user-2');

      // Alice: Paid 100, owes 50 = +50, received 30+20 = +100
      // Bob: Owes 50, paid 30+20 = -50 - 50 = -100
      expect(aliceBalance?.balance).toBe(100);
      expect(bobBalance?.balance).toBe(-100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle expenses with expense_splits property', () => {
      const expenses: any[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          expense_splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        },
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      expect(aliceBalance?.balance).toBe(50);
    });

    it('should handle missing splits gracefully', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const aliceBalance = result.current.find(b => b.user_id === 'user-1');
      expect(aliceBalance?.balance).toBe(100); // Paid 100, no splits = +100
    });

    it('should round balances to 2 decimal places', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100.333,
          splits: [
            { user_id: 'user-1', computed_amount: 33.444 },
            { user_id: 'user-2', computed_amount: 33.444 },
            { user_id: 'user-3', computed_amount: 33.445 },
          ],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      result.current.forEach(balance => {
        expect(balance.balance.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      });
    });

    it('should include removed members who have expenses', () => {
      // user-4 is NOT in mockMembers but paid for an expense
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-4',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-4', computed_amount: 50 },
          ],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const removedMember = result.current.find(b => b.user_id === 'user-4');
      expect(removedMember).toBeDefined();
      expect(removedMember?.user_name).toBe('Former Member');
      expect(removedMember?.balance).toBe(50); // Paid 100, owes 50 = +50
    });

    it('should include removed members who have payments', () => {
      const payments: Payment[] = [
        {
          id: 'pay-1',
          from_user: 'user-5',
          to_user: 'user-1',
          amount: 30,
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses: [],
          payments,
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const removedMember = result.current.find(b => b.user_id === 'user-5');
      expect(removedMember).toBeDefined();
      expect(removedMember?.user_name).toBe('Former Member');
      expect(removedMember?.avatar_url).toBeNull();
      expect(removedMember?.balance).toBe(-30); // Paid 30 to user-1
    });

    it('should sort balances (debts first, then credits)', () => {
      const expenses: ExpenseWithSplits[] = [
        {
          id: 'exp-1',
          paid_by_user_id: 'user-1',
          amount: 100,
          splits: [
            { user_id: 'user-1', computed_amount: 50 },
            { user_id: 'user-2', computed_amount: 50 },
          ],
        } as any,
      ];

      const { result } = renderHook(() =>
        useBalanceCalculation({
          expenses,
          payments: [],
          currentUserId: 'user-1',
          members: mockMembers,
        })
      );

      const balances = result.current.map(b => b.balance);
      for (let i = 0; i < balances.length - 1; i++) {
        expect(balances[i]).toBeLessThanOrEqual(balances[i + 1]);
      }
    });
  });

  describe('useMyDebts', () => {
    const mockBalances = [
      { user_id: 'user-1', user_name: 'Alice', avatar_url: null, balance: 50 },
      { user_id: 'user-2', user_name: 'Bob', avatar_url: null, balance: -30 },
      { user_id: 'user-3', user_name: 'Charlie', avatar_url: null, balance: -20 },
    ];

    it('should return empty array if current user not found', () => {
      const { result } = renderHook(() =>
        useMyDebts(mockBalances, 'user-999')
      );

      expect(result.current).toEqual([]);
    });

    it('should identify users who owe current user', () => {
      const { result } = renderHook(() =>
        useMyDebts(mockBalances, 'user-1')
      );

      const debts = result.current.filter(d => d.type === 'owes_me');
      expect(debts.length).toBeGreaterThan(0);
    });

    it('should identify users current user owes', () => {
      const mockBalances2 = [
        { user_id: 'user-1', user_name: 'Alice', avatar_url: null, balance: -50 },
        { user_id: 'user-2', user_name: 'Bob', avatar_url: null, balance: 30 },
      ];

      const { result } = renderHook(() =>
        useMyDebts(mockBalances2, 'user-1')
      );

      const debts = result.current.filter(d => d.type === 'i_owe');
      expect(debts.length).toBeGreaterThan(0);
    });

    it('should exclude current user from debts', () => {
      const { result } = renderHook(() =>
        useMyDebts(mockBalances, 'user-1')
      );

      result.current.forEach(debt => {
        expect(debt.user.user_id).not.toBe('user-1');
      });
    });

    it('should exclude zero balances', () => {
      const mockBalancesWithZero = [
        { user_id: 'user-1', user_name: 'Alice', avatar_url: null, balance: 50 },
        { user_id: 'user-2', user_name: 'Bob', avatar_url: null, balance: 0 },
      ];

      const { result } = renderHook(() =>
        useMyDebts(mockBalancesWithZero, 'user-1')
      );

      const bobDebt = result.current.find(d => d.user.user_id === 'user-2');
      expect(bobDebt).toBeUndefined();
    });
  });
});
