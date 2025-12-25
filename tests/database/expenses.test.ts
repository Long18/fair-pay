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

describe('Expenses CRUD Operations', () => {
  let user1Id: string;
  let user2Id: string;
  let testGroupId: string;
  let testExpenseId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(testUsers.user1);
    const { user: u2 } = await createTestUser(testUsers.user2);
    user1Id = u1!.id;
    user2Id = u2!.id;

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const { data: group } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group for Expenses',
        created_by: user1Id,
      })
      .select()
      .single();

    testGroupId = group!.id;

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

  describe('CREATE', () => {
    it('should create an expense with splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Dinner at restaurant',
          amount: 120000,
          currency: 'VND',
          category: 'Food & Dining',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(expense).toBeDefined();
      expect(expense?.description).toBe('Dinner at restaurant');
      expect(expense?.amount).toBe(120000);

      testExpenseId = expense!.id;

      await signOutTestUser();
    });

    it('should create expense splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const splits = [
        {
          expense_id: testExpenseId,
          user_id: user1Id,
          split_method: 'equal',
          split_value: 50,
          computed_amount: 60000,
        },
        {
          expense_id: testExpenseId,
          user_id: user2Id,
          split_method: 'equal',
          split_value: 50,
          computed_amount: 60000,
        },
      ];

      const { error } = await supabase.from('expense_splits').insert(splits);

      expect(error).toBeNull();

      const { data: savedSplits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', testExpenseId);

      expect(savedSplits).toHaveLength(2);

      await signOutTestUser();
    });

    it('should have timestamps on creation', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .select('created_at, updated_at')
        .eq('id', testExpenseId)
        .single();

      expect(expense?.created_at).toBeDefined();
      expect(expense?.updated_at).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('READ', () => {
    it('should fetch expenses for group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', testGroupId);

      expect(error).toBeNull();
      expect(expenses).toHaveLength(1);

      await signOutTestUser();
    });

    it('should fetch expense with splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .select('*, expense_splits:expense_id(*)')
        .eq('id', testExpenseId)
        .single();

      expect(expense).toBeDefined();
      expect(expense?.expense_splits).toHaveLength(2);

      await signOutTestUser();
    });

    it('should fetch expense with payer profile', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .select('*, profiles:paid_by_user_id(*)')
        .eq('id', testExpenseId)
        .single();

      expect(expense?.profiles).toBeDefined();
      expect(expense?.profiles.id).toBe(user1Id);

      await signOutTestUser();
    });

    it('should allow other participants to view expense', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', testExpenseId);

      expect(expenses).toHaveLength(1);

      await signOutTestUser();
    });

    it('should NOT allow non-participants to view expense (RLS)', async () => {
      const { user: u3 } = await createTestUser(testUsers.user3);

      await signInTestUser(testUsers.user3.email, testUsers.user3.password);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', testExpenseId);

      expect(expenses).toEqual([]);

      await signOutTestUser();
      await cleanupTestUser(u3!.id);
    });
  });

  describe('UPDATE', () => {
    it('should NOT update expense (feature not implemented)', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase
        .from('expenses')
        .update({ description: 'Updated Description' })
        .eq('id', testExpenseId);

      expect(error).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('DELETE', () => {
    it('should delete expense as participant', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: newExpense } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Expense to delete',
          amount: 50000,
          currency: 'VND',
          category: 'Other',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', newExpense!.id);

      expect(error).toBeNull();

      await signOutTestUser();
    });

    it('should cascade delete expense splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: newExpense } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Cascade test',
          amount: 100000,
          currency: 'VND',
          category: 'Other',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      await supabase.from('expense_splits').insert([
        {
          expense_id: newExpense!.id,
          user_id: user1Id,
          split_method: 'equal',
          split_value: 100,
          computed_amount: 100000,
        },
      ]);

      await supabase.from('expenses').delete().eq('id', newExpense!.id);

      const { data: splits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', newExpense!.id);

      expect(splits).toEqual([]);

      await signOutTestUser();
    });
  });

  describe('Split Methods', () => {
    it('should support equal splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: splits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', testExpenseId);

      const equalSplits = splits?.filter((s: any) => s.split_method === 'equal');
      expect(equalSplits?.length).toBeGreaterThan(0);

      await signOutTestUser();
    });

    it('should support exact amount splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Exact split test',
          amount: 100000,
          currency: 'VND',
          category: 'Other',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      await supabase.from('expense_splits').insert([
        {
          expense_id: expense!.id,
          user_id: user1Id,
          split_method: 'exact',
          split_value: 70000,
          computed_amount: 70000,
        },
        {
          expense_id: expense!.id,
          user_id: user2Id,
          split_method: 'exact',
          split_value: 30000,
          computed_amount: 30000,
        },
      ]);

      const { data: splits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', expense!.id);

      expect(splits).toHaveLength(2);
      expect(splits?.[0].split_method).toBe('exact');

      await signOutTestUser();
    });

    it('should support percentage splits', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: testGroupId,
          description: 'Percentage split test',
          amount: 100000,
          currency: 'VND',
          category: 'Other',
          expense_date: new Date().toISOString(),
          paid_by_user_id: user1Id,
          created_by: user1Id,
        })
        .select()
        .single();

      await supabase.from('expense_splits').insert([
        {
          expense_id: expense!.id,
          user_id: user1Id,
          split_method: 'percentage',
          split_value: 60,
          computed_amount: 60000,
        },
        {
          expense_id: expense!.id,
          user_id: user2Id,
          split_method: 'percentage',
          split_value: 40,
          computed_amount: 40000,
        },
      ]);

      const { data: splits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', expense!.id);

      expect(splits).toHaveLength(2);
      const percentageSplit = splits?.find((s: any) => s.user_id === user1Id);
      expect(percentageSplit?.split_value).toBe(60);

      await signOutTestUser();
    });
  });

  describe('Context Types', () => {
    it('should support group expenses', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: expense } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', testExpenseId)
        .single();

      expect(expense?.context_type).toBe('group');
      expect(expense?.group_id).toBe(testGroupId);
      expect(expense?.friendship_id).toBeNull();

      await signOutTestUser();
    });
  });

  describe('RLS Policies', () => {
    it('should require authentication', async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', testExpenseId);

      expect(data).toEqual([]);
    });

    it('should allow participants to view', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', testExpenseId);

      expect(data).toHaveLength(1);

      await signOutTestUser();
    });
  });
});

