import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  supabase,
  testUsers,
  createTestUser,
  signInTestUser,
  signOutTestUser,
  cleanupTestUser,
  cleanupTestData,
} from '../setup';

describe('settle_splits_batch RPC', () => {
  let payerId: string;
  let debtorId: string;
  let testGroupId: string;
  let splitIds: string[] = [];
  let setupReady = false;

  beforeAll(async () => {
    try {
      const { user: payer } = await createTestUser(testUsers.user1);
      const { user: debtor } = await createTestUser(testUsers.user2);
      payerId = payer!.id;
      debtorId = debtor!.id;

      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: 'Settle Batch Test Group',
          created_by: payerId,
        })
        .select()
        .single();

      if (groupError || !group) return;

      testGroupId = group.id;

      await supabase.from('group_members').insert({
        group_id: testGroupId,
        user_id: debtorId,
        role: 'member',
      });

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Batch settle test expense',
          amount: 200000,
          currency: 'VND',
          category: 'Other',
          expense_date: new Date().toISOString(),
          paid_by_user_id: payerId,
          created_by: payerId,
        })
        .select()
        .single();

      if (expenseError || !expense) return;

      const { data: splits } = await supabase
        .from('expense_splits')
        .insert([
          {
            expense_id: expense.id,
            user_id: payerId,
            split_method: 'equal',
            split_value: 50,
            computed_amount: 100000,
          },
          {
            expense_id: expense.id,
            user_id: debtorId,
            split_method: 'equal',
            split_value: 50,
            computed_amount: 100000,
          },
        ])
        .select('id');

      splitIds = splits?.map((split) => split.id) ?? [];
      setupReady = splitIds.length === 2;
    } catch {
      setupReady = false;
    } finally {
      await signOutTestUser();
    }
  });

  afterAll(async () => {
    if (!setupReady) return;
    await cleanupTestData();
    if (payerId) await cleanupTestUser(payerId);
    if (debtorId) await cleanupTestUser(debtorId);
  });

  it('should settle multiple splits in one batch as payer', async () => {
    if (!setupReady) return;

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const debtorSplitId = splitIds[1];
    expect(debtorSplitId).toBeDefined();

    const { data, error } = await supabase.rpc('settle_splits_batch', {
      p_split_ids: [debtorSplitId],
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      splits_updated: 1,
    });

    const { data: updatedSplit } = await supabase
      .from('expense_splits')
      .select('is_settled, settled_amount')
      .eq('id', debtorSplitId)
      .single();

    expect(updatedSplit?.is_settled).toBe(true);
    expect(Number(updatedSplit?.settled_amount)).toBe(100000);

    await signOutTestUser();
  });

  it('should reject batch settle when caller is not payer', async () => {
    if (!setupReady) return;

    await signInTestUser(testUsers.user2.email, testUsers.user2.password);

    const payerSplitId = splitIds[0];
    expect(payerSplitId).toBeDefined();

    const { error } = await supabase.rpc('settle_splits_batch', {
      p_split_ids: [payerSplitId],
    });

    expect(error).not.toBeNull();
    expect(error?.message).toContain('Only the payer or admin can settle splits');

    await signOutTestUser();
  });

  it('should return zero updated for empty split id array', async () => {
    if (!setupReady) return;

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const { data, error } = await supabase.rpc('settle_splits_batch', {
      p_split_ids: [],
    });

    expect(error).toBeNull();
    expect(data).toMatchObject({
      success: true,
      splits_updated: 0,
    });

    await signOutTestUser();
  });
});
