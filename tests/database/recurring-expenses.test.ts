import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase, signInTestUser, cleanupTestData, testUsers, createTestUser, cleanupTestUser, signOutTestUser } from '../setup';

describe('Recurring Expenses CRUD Operations', () => {
  let userId1: string;
  let userId2: string;
  let groupId: string;
  let expenseId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(testUsers.user1);
    const { user: u2 } = await createTestUser(testUsers.user2);
    userId1 = u1!.id;
    userId2 = u2!.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestUser(userId1);
    await cleanupTestUser(userId2);
  });

  beforeEach(async () => {
    await cleanupTestData();

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Rent Group',
        description: 'Monthly rent',
        created_by: userId1,
      })
      .select()
      .single();

    expect(groupError).toBeNull();
    expect(group).toBeDefined();
    groupId = group.id;

    await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId2,
        role: 'member',
      });

    await signOutTestUser();

    await signInTestUser(testUsers.user1);

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        description: 'Monthly Rent',
        amount: 10000000,
        currency: 'VND',
        category: 'housing',
        expense_date: '2025-01-01',
        paid_by_user_id: userId1,
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(expenseError).toBeNull();
    expect(expense).toBeDefined();
    expenseId = expense.id;
  });

  it('should create a recurring expense', async () => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.frequency).toBe('monthly');
    expect(data?.interval).toBe(1);
    expect(data?.is_active).toBe(true);
    expect(data?.notify_before_days).toBe(1);
  });

  it('should read recurring expenses', async () => {
    await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'weekly',
        interval: 2,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      });

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select('*, template_expense:expenses!template_expense_id(*)')
      .eq('group_id', groupId);

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.length).toBe(1);
    expect(data?.[0].frequency).toBe('weekly');
    expect(data?.[0].interval).toBe(2);
    expect(data?.[0].template_expense).toBeDefined();
    expect(data?.[0].template_expense.description).toBe('Monthly Rent');
  });

  it('should update recurring expense status', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ is_active: false })
      .eq('id', recurring!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.is_active).toBe(false);
  });

  it('should update next_occurrence date', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    const { data, error } = await supabase
      .from('recurring_expenses')
      .update({ next_occurrence: '2025-02-01' })
      .eq('id', recurring!.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.next_occurrence).toBe('2025-02-01');
  });

  it('should delete recurring expense', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    const { error } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', recurring!.id);

    expect(error).toBeNull();

    const { data } = await supabase
      .from('recurring_expenses')
      .select()
      .eq('id', recurring!.id);

    expect(data?.length).toBe(0);
  });

  it('should enforce RLS: only participants can view recurring expenses', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    const user3 = await signInTestUser({ email: 'user3@test.com', password: 'password123' });

    const { data, error } = await supabase
      .from('recurring_expenses')
      .select()
      .eq('id', recurring!.id);

    expect(data?.length).toBe(0);
  });

  it('should enforce RLS: only creator can update/delete recurring expenses', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    await signInTestUser(testUsers.user2);

    const { error: updateError } = await supabase
      .from('recurring_expenses')
      .update({ is_active: false })
      .eq('id', recurring!.id);

    expect(updateError).not.toBeNull();

    const { error: deleteError } = await supabase
      .from('recurring_expenses')
      .delete()
      .eq('id', recurring!.id);

    expect(deleteError).not.toBeNull();
  });

  it('should support different frequencies', async () => {
    const frequencies = ['weekly', 'bi_weekly', 'monthly', 'quarterly', 'yearly', 'custom'];

    for (const frequency of frequencies) {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          template_expense_id: expenseId,
          frequency,
          interval: 1,
          start_date: '2025-01-01',
          next_occurrence: '2025-01-01',
          context_type: 'group',
          group_id: groupId,
          created_by: userId1,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.frequency).toBe(frequency);
    }
  });

  it('should support custom interval', async () => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 3,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.interval).toBe(3);
  });

  it('should support end_date (optional)', async () => {
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.end_date).toBe('2025-12-31');
  });

  it('should return due recurring expenses for a supplied reference date', async () => {
    const { data: dueRecurring, error: dueInsertError } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-03-01',
        next_occurrence: '2026-03-10',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(dueInsertError).toBeNull();

    const { data: futureRecurring, error: futureInsertError } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-03-01',
        next_occurrence: '2026-03-11',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(futureInsertError).toBeNull();

    const { data, error } = await supabase.rpc('get_due_recurring_expenses_for_date', {
      p_reference_date: '2026-03-10',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.map((item: any) => item.id)).toContain(dueRecurring!.id);
    expect(data?.map((item: any) => item.id)).not.toContain(futureRecurring!.id);
  });

  it('should exclude recurring expenses whose end_date is before the supplied reference date', async () => {
    const { data: expiredRecurring, error: expiredInsertError } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-03-01',
        end_date: '2026-03-09',
        next_occurrence: '2026-03-09',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(expiredInsertError).toBeNull();

    const { data, error } = await supabase.rpc('get_due_recurring_expenses_for_date', {
      p_reference_date: '2026-03-10',
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.map((item: any) => item.id)).not.toContain(expiredRecurring!.id);
  });

  it('should process one recurring cycle idempotently', async () => {
    const { data: recurring, error: recurringInsertError } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2026-03-01',
        next_occurrence: '2026-03-10',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    expect(recurringInsertError).toBeNull();

    const { data: firstRun, error: firstRunError } = await supabase.rpc('process_single_recurring_instance', {
      p_recurring_expense_id: recurring!.id,
      p_cycle_date: '2026-03-10',
    });

    expect(firstRunError).toBeNull();
    expect(firstRun?.success).toBe(true);
    expect(firstRun?.skipped).toBe(false);
    expect(firstRun?.next_occurrence).toBe('2026-04-10');

    const { data: secondRun, error: secondRunError } = await supabase.rpc('process_single_recurring_instance', {
      p_recurring_expense_id: recurring!.id,
      p_cycle_date: '2026-03-10',
    });

    expect(secondRunError).toBeNull();
    expect(secondRun?.success).toBe(true);
    expect(secondRun?.skipped).toBe(true);

    const { data: generatedExpenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, cycle_date, recurring_expense_id')
      .eq('recurring_expense_id', recurring!.id)
      .eq('cycle_date', '2026-03-10');

    expect(expensesError).toBeNull();
    expect(generatedExpenses).toHaveLength(1);
  });

  it('should cascade delete when template expense is deleted', async () => {
    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .insert({
        template_expense_id: expenseId,
        frequency: 'monthly',
        interval: 1,
        start_date: '2025-01-01',
        next_occurrence: '2025-01-01',
        context_type: 'group',
        group_id: groupId,
        created_by: userId1,
      })
      .select()
      .single();

    await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    const { data } = await supabase
      .from('recurring_expenses')
      .select()
      .eq('id', recurring!.id);

    expect(data?.length).toBe(0);
  });
});

describe('Recurring Expenses Helper Functions', () => {
  it('should calculate next occurrence for monthly frequency', async () => {
    const { data, error } = await supabase.rpc('calculate_next_occurrence', {
      p_current_date: '2025-01-15',
      p_frequency: 'monthly',
      p_interval_value: 1,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toBe('2025-02-15');
  });

  it('should calculate next occurrence for weekly frequency', async () => {
    const { data, error } = await supabase.rpc('calculate_next_occurrence', {
      p_current_date: '2025-01-15',
      p_frequency: 'weekly',
      p_interval_value: 2,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toBe('2025-01-29');
  });

  it('should calculate next occurrence for yearly frequency', async () => {
    const { data, error } = await supabase.rpc('calculate_next_occurrence', {
      p_current_date: '2025-01-15',
      p_frequency: 'yearly',
      p_interval_value: 1,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toBe('2026-01-15');
  });
});
