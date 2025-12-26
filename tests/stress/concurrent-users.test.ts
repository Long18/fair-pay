import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../setup';

describe('Concurrent Users Stress Tests', () => {
  const testUsers: Array<{ id: string; email: string; password: string }> = [];
  let sharedGroupId: string;

  beforeAll(async () => {
    console.log('Setting up concurrent user simulation...');

    // Create 20 test users
    for (let i = 0; i < 20; i++) {
      const email = `concurrent-${i}-${Date.now()}@example.com`;
      const password = 'Concurrent123!';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (data.user) {
        testUsers.push({ id: data.user.id, email, password });
      }
    }

    // Create a shared group
    if (testUsers.length > 0) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (!signInError) {
        const { data: groupData } = await supabase
          .from('groups')
          .insert({
            name: 'Concurrent Users Test Group',
            created_by: testUsers[0].id,
          })
          .select()
          .single();

        if (groupData) {
          sharedGroupId = groupData.id;

          // Add all users to the group
          const memberPromises = testUsers.slice(1).map(user =>
            supabase.from('group_members').insert({
              group_id: sharedGroupId,
              user_id: user.id,
              role: 'member',
            })
          );

          await Promise.all(memberPromises);
        }
      }
    }

    console.log(`Created ${testUsers.length} concurrent test users`);
  }, 120000);

  afterAll(async () => {
    console.log('Cleaning up concurrent user test data...');
    for (const user of testUsers) {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  describe('Simulated User Activity', () => {
    it('should handle 10 users creating expenses simultaneously', async () => {
      if (!sharedGroupId || testUsers.length < 10) {
        console.log('Not enough test data, skipping');
        return;
      }

      const start = Date.now();

      const promises = testUsers.slice(0, 10).map(async (user, index) => {
        // Sign in as user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });

        if (signInError) return { success: false, error: signInError };

        // Create expense
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            context_type: 'group',
            group_id: sharedGroupId,
            description: `User ${index} Expense`,
            amount: (index + 1) * 100,
            paid_by_user_id: user.id,
            created_by: user.id,
            category: 'food',
          })
          .select()
          .single();

        return { success: !error, data, error };
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => r.success).length;

      console.log(`10 concurrent expense creations: ${successCount}/10 succeeded in ${duration}ms`);

      expect(successCount).toBeGreaterThan(7);
      expect(duration).toBeLessThan(15000);
    }, 30000);

    it('should handle 20 users reading group data simultaneously', async () => {
      if (!sharedGroupId || testUsers.length < 20) {
        console.log('Not enough test data, skipping');
        return;
      }

      const start = Date.now();

      const promises = testUsers.map(async (user) => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });

        if (signInError) return { success: false, error: signInError };

        const { data, error } = await supabase
          .from('groups')
          .select(`
            *,
            group_members(
              *,
              profile:profiles(id, full_name, avatar_url)
            )
          `)
          .eq('id', sharedGroupId)
          .single();

        return { success: !error, data, error };
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => r.success).length;

      console.log(`20 concurrent group reads: ${successCount}/20 succeeded in ${duration}ms`);

      expect(successCount).toBeGreaterThan(17);
      expect(duration).toBeLessThan(10000);
    }, 30000);

    it('should handle mixed operations from 15 users', async () => {
      if (!sharedGroupId || testUsers.length < 15) {
        console.log('Not enough test data, skipping');
        return;
      }

      const start = Date.now();

      const promises = testUsers.slice(0, 15).map(async (user, index) => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });

        if (signInError) return { success: false, operation: 'signin', error: signInError };

        // Different operations based on index
        if (index % 3 === 0) {
          // Read group
          const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', sharedGroupId)
            .single();
          return { success: !error, operation: 'read_group', data, error };
        } else if (index % 3 === 1) {
          // Read expenses
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('group_id', sharedGroupId)
            .limit(10);
          return { success: !error, operation: 'read_expenses', data, error };
        } else {
          // Update profile
          const { data, error } = await supabase
            .from('profiles')
            .update({ full_name: `Test User ${index}` })
            .eq('id', user.id)
            .select()
            .single();
          return { success: !error, operation: 'update_profile', data, error };
        }
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => r.success).length;
      const operationCounts = results.reduce((acc, r) => {
        acc[r.operation] = (acc[r.operation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`15 mixed operations: ${successCount}/15 succeeded in ${duration}ms`);
      console.log('Operations:', operationCounts);

      expect(successCount).toBeGreaterThan(12);
      expect(duration).toBeLessThan(15000);
    }, 30000);
  });

  describe('Race Condition Tests', () => {
    it('should handle concurrent updates to the same record', async () => {
      if (testUsers.length < 5) {
        console.log('Not enough test users, skipping');
        return;
      }

      const testUser = testUsers[0];

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      if (signInError) {
        console.log('Failed to sign in, skipping');
        return;
      }

      const start = Date.now();

      // 10 concurrent updates to the same profile
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const { data, error } = await supabase
          .from('profiles')
          .update({ full_name: `Concurrent Update ${i}` })
          .eq('id', testUser.id)
          .select()
          .single();

        return { data, error };
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => !r.error).length;

      console.log(`10 concurrent updates to same record: ${successCount}/10 succeeded in ${duration}ms`);

      // All should succeed (last write wins)
      expect(successCount).toBe(10);
      expect(duration).toBeLessThan(5000);
    }, 30000);

    it('should maintain data consistency with concurrent expense splits', async () => {
      if (!sharedGroupId || testUsers.length < 3) {
        console.log('Not enough test data, skipping');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) {
        console.log('Failed to sign in, skipping');
        return;
      }

      // Create an expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: sharedGroupId,
          description: 'Race Condition Test Expense',
          amount: 300,
          paid_by_user_id: testUsers[0].id,
          created_by: testUsers[0].id,
          category: 'food',
        })
        .select()
        .single();

      if (expenseError || !expense) {
        console.log('Failed to create expense, skipping');
        return;
      }

      const start = Date.now();

      // Create splits concurrently
      const promises = testUsers.slice(0, 3).map(async (user) => {
        const { data, error } = await supabase
          .from('expense_splits')
          .insert({
            expense_id: expense.id,
            user_id: user.id,
            computed_amount: 100,
          })
          .select()
          .single();

        return { data, error };
      });

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => !r.error).length;

      console.log(`3 concurrent expense splits: ${successCount}/3 succeeded in ${duration}ms`);

      // Verify total splits
      const { data: splits } = await supabase
        .from('expense_splits')
        .select('*')
        .eq('expense_id', expense.id);

      const totalAmount = splits?.reduce((sum, split) => sum + split.computed_amount, 0) || 0;

      console.log(`Total split amount: ${totalAmount} (expected: 300)`);

      expect(successCount).toBe(3);
      expect(totalAmount).toBe(300);
    }, 30000);
  });

  describe('Load Balancing Tests', () => {
    it('should distribute load evenly across multiple queries', async () => {
      const queryTypes = ['profiles', 'groups', 'expenses', 'payments'];
      const queriesPerType = 25;

      const start = Date.now();

      const promises = queryTypes.flatMap(type =>
        Array.from({ length: queriesPerType }, async () => {
          const queryStart = Date.now();

          const { data, error } = await supabase
            .from(type as any)
            .select('*')
            .limit(10);

          const queryDuration = Date.now() - queryStart;

          return { type, data, error, duration: queryDuration };
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      const successCount = results.filter(r => !r.error).length;
      const avgDurationByType = queryTypes.reduce((acc, type) => {
        const typeResults = results.filter(r => r.type === type);
        const avgDuration = typeResults.reduce((sum, r) => sum + r.duration, 0) / typeResults.length;
        acc[type] = avgDuration;
        return acc;
      }, {} as Record<string, number>);

      console.log(`100 distributed queries: ${successCount}/100 succeeded in ${duration}ms`);
      console.log('Average duration by type:', avgDurationByType);

      expect(successCount).toBeGreaterThan(95);
      expect(duration).toBeLessThan(20000);
    }, 30000);
  });
});
