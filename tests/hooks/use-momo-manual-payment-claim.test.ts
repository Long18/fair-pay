import { describe, it, expect } from 'vitest';
import { buildMomoManualClaimRpcArgs } from '@/hooks/payment/use-momo-manual-payment-claim';

describe('buildMomoManualClaimRpcArgs', () => {
  const payeeId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';

  it('treats equal split and expense id as debt placeholder (no split FK)', () => {
    const id = 'bbbbbbbb-cccc-4ddd-eeee-ffffffffffff';
    expect(
      buildMomoManualClaimRpcArgs({
        payeeId,
        amount: 50000,
        expenseSplitId: id,
        expenseId: id,
      }),
    ).toEqual({
      p_payee_id: payeeId,
      p_amount: 50000,
      p_expense_split_id: null,
      p_expense_id: null,
      p_currency: 'VND',
    });
  });

  it('passes distinct expense split and expense ids', () => {
    const splitId = '11111111-2222-4333-8444-555555555555';
    const expenseId = '66666666-7777-4888-9444-aaaaaaaaaaaa';
    expect(
      buildMomoManualClaimRpcArgs({
        payeeId,
        amount: 120000,
        expenseSplitId: splitId,
        expenseId,
      }),
    ).toEqual({
      p_payee_id: payeeId,
      p_amount: 120000,
      p_expense_split_id: splitId,
      p_expense_id: expenseId,
      p_currency: 'VND',
    });
  });
});
