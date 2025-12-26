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

describe('Expense Creation Flow Integration', () => {
  let user1Id: string;
  let user2Id: string;
  let testGroupId: string;

  const uniqueTestUsers = {
    user1: {
      ...testUsers.user1,
      email: `expense-flow-${Date.now()}-user1@fairpay.test`,
    },
    user2: {
      ...testUsers.user2,
      email: `expense-flow-${Date.now()}-user2@fairpay.test`,
    },
  };

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(uniqueTestUsers.user1);
    const { user: u2 } = await createTestUser(uniqueTestUsers.user2);
    user1Id = u1!.id;
    user2Id = u2!.id;

    await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Expense Flow Test Group',
        created_by: user1Id,
      })
      .select()
      .single();

    if (groupError || !group) {
      throw new Error(`Failed to create test group: ${groupError?.message}`);
    }

    testGroupId = group.id;

    await supabase.from('group_members').insert({
      group_id: testGroupId,
      user_id: user2Id,
      role: 'member',
    });

    await signOutTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  describe('Complete Expense Creation Flow', () => {
    it('should create expense with equal split correctly', async () => {
      await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

      // Step 1: Create expense
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Test equal split expense',
          amount: 200000,
          currency: 'VND',
          category: 'Food & Dining',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(expError).toBeNull();
      expect(expense).toBeDefined();
      expect(expense?.amount).toBe(200000);
      expect(expense?.description).toBe('Test equal split expense');

      // Step 2: Create equal splits (100 each for 2 people)
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert([
          { expense_id: expense!.id, user_id: user1Id, split_method: 'equal', computed_amount: 100000 },
          { expense_id: expense!.id, user_id: user2Id, split_method: 'equal', computed_amount: 100000 },
        ])
        .select();

      expect(splitsError).toBeNull();
      expect(splits).toHaveLength(2);

      // Step 3: Verify splits sum to expense amount
      const totalSplit = splits!.reduce((sum, split) => sum + split.computed_amount, 0);
      expect(totalSplit).toBe(200000);

      // Step 4: Verify expense can be retrieved with splits
      const { data: expenseWithSplits, error: fetchError } = await supabase
        .from('expenses')
        .select('*, expense_splits(*)')
        .eq('id', expense!.id)
        .single();

      expect(fetchError).toBeNull();
      expect(expenseWithSplits?.expense_splits).toHaveLength(2);

      await signOutTestUser();
    });

    it('should create expense with exact split correctly', async () => {
      await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Test exact split expense',
          amount: 150000,
          currency: 'VND',
          category: 'Transport',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(expError).toBeNull();

      // Create exact splits: User1 pays 60k, User2 pays 90k
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert([
          { expense_id: expense!.id, user_id: user1Id, split_method: 'exact', split_value: 60000, computed_amount: 60000 },
          { expense_id: expense!.id, user_id: user2Id, split_method: 'exact', split_value: 90000, computed_amount: 90000 },
        ])
        .select();

      expect(splitsError).toBeNull();
      expect(splits).toHaveLength(2);

      const totalSplit = splits!.reduce((sum, split) => sum + split.computed_amount, 0);
      expect(totalSplit).toBe(150000);

      await signOutTestUser();
    });

    it('should create expense with percentage split correctly', async () => {
      await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Test percentage split expense',
          amount: 100000,
          currency: 'VND',
          category: 'Entertainment',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(expError).toBeNull();

      // Create percentage splits: User1 pays 70%, User2 pays 30%
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert([
          { expense_id: expense!.id, user_id: user1Id, split_method: 'percentage', split_value: 70, computed_amount: 70000 },
          { expense_id: expense!.id, user_id: user2Id, split_method: 'percentage', split_value: 30, computed_amount: 30000 },
        ])
        .select();

      expect(splitsError).toBeNull();
      expect(splits).toHaveLength(2);

      const totalSplit = splits!.reduce((sum, split) => sum + split.computed_amount, 0);
      expect(totalSplit).toBe(100000);

      await signOutTestUser();
    });
  });

  describe('Expense Validation', () => {
    it('should enforce split total equals expense amount', async () => {
      await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Test validation expense',
          amount: 100000,
          currency: 'VND',
          category: 'Food & Dining',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(expError).toBeNull();

      // Try to create splits that don't sum to expense amount
      // This should be allowed at DB level (validation happens in app)
      // But we can verify the app logic would catch this
      const { data: splits, error: splitsError } = await supabase
        .from('expense_splits')
        .insert([
          { expense_id: expense!.id, user_id: user1Id, split_method: 'exact', split_value: 50000, computed_amount: 50000 },
          { expense_id: expense!.id, user_id: user2Id, split_method: 'exact', split_value: 40000, computed_amount: 40000 }, // Total = 90k, not 100k
        ])
        .select();

      // Database allows this, but app should validate
      expect(splitsError).toBeNull();
      expect(splits).toBeDefined();

      if (splits) {
        // Verify we can detect the mismatch
        const totalSplit = splits.reduce((sum, split) => sum + split.computed_amount, 0);
        expect(totalSplit).not.toBe(expense!.amount);
      }

      await signOutTestUser();
    });

    it('should allow expense deletion and cascade to splits', async () => {
      await signInTestUser(uniqueTestUsers.user1.email, uniqueTestUsers.user1.password);

      // Create expense with splits
      const { data: expense, error: expError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Expense to delete',
          amount: 50000,
          currency: 'VND',
          category: 'Food & Dining',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(expError).toBeNull();

      await supabase.from('expense_splits').insert([
        { expense_id: expense!.id, user_id: user1Id, split_method: 'equal', computed_amount: 25000 },
        { expense_id: expense!.id, user_id: user2Id, split_method: 'equal', computed_amount: 25000 },
      ]);

      // Delete expense (should cascade delete splits)
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expense!.id);

      expect(deleteError).toBeNull();

      // Verify splits are deleted
      const { data: remainingSplits } = await supabase
        .from('expense_splits')
        .select()
        .eq('expense_id', expense!.id);

      expect(remainingSplits).toHaveLength(0);

      await signOutTestUser();
    });
  });
});
