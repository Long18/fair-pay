import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../setup';

describe('Database Stress Tests', () => {
  const testUsers: Array<{ id: string; email: string; password: string }> = [];
  const testGroups: Array<{ id: string; name: string }> = [];

  beforeAll(async () => {
    console.log('Setting up stress test users...');
    for (let i = 0; i < 5; i++) {
      const email = `stress-test-${i}-${Date.now()}@example.com`;
      const password = 'StressTest123!';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error(`Failed to create user ${i}:`, error);
        continue;
      }

      if (data.user) {
        testUsers.push({ id: data.user.id, email, password });
      }
    }
    console.log(`Created ${testUsers.length} test users`);
  });

  afterAll(async () => {
    console.log('Cleaning up stress test data...');
    for (const user of testUsers) {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  describe('Concurrent Group Operations', () => {
    it('should handle concurrent group creation', async () => {
      const promises = testUsers.map(async (user) => {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password,
        });

        if (signInError) throw signInError;

        const { data, error } = await supabase
          .from('groups')
          .insert({
            name: `Stress Test Group - ${user.email}`,
            created_by: user.id,
          })
          .select()
          .single();

        if (data) {
          testGroups.push({ id: data.id, name: data.name });
        }

        return { data, error };
      });

      const results = await Promise.all(promises);

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;
      const errors = results.filter(r => r.error).map(r => r.error);

      console.log(`Group creation: ${successCount} succeeded, ${errorCount} failed`);
      if (errors.length > 0) {
        console.log('First error:', JSON.stringify(errors[0], null, 2));
      }
      expect(successCount).toBeGreaterThan(0);
    }, 30000);

    it('should handle concurrent group member additions', async () => {
      if (testGroups.length === 0) {
        console.log('No groups available for member addition test');
        return;
      }

      // Sign in as first user and find their group
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) throw signInError;

      // Find the group created by testUsers[0]
      const userGroup = testGroups.find(g => g.name.includes(testUsers[0].email));
      if (!userGroup) {
        console.log('Could not find group created by test user 0');
        return;
      }

      const promises = testUsers.slice(1, 4).map(async (user) => {
        const { data, error } = await supabase
          .from('group_members')
          .insert({
            group_id: userGroup.id,
            user_id: user.id,
            role: 'member',
          })
          .select()
          .single();

        return { data, error };
      });

      const results = await Promise.all(promises);

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;
      const errors = results.filter(r => r.error).map(r => r.error);

      console.log(`Member additions: ${successCount} succeeded, ${errorCount} failed`);
      if (errors.length > 0) {
        console.log('First member addition error:', JSON.stringify(errors[0], null, 2));
      }
      expect(successCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Concurrent Expense Operations', () => {
    it('should handle concurrent expense creation', async () => {
      if (testGroups.length === 0) {
        console.log('No groups available for expense test');
        return;
      }

      // Sign in as first user and find their group
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) throw signInError;

      const userGroup = testGroups.find(g => g.name.includes(testUsers[0].email));
      if (!userGroup) {
        console.log('Could not find group created by test user 0');
        return;
      }

      const promises = Array.from({ length: 10 }, async (_, i) => {
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            context_type: 'group',
            group_id: userGroup.id,
            description: `Stress Test Expense ${i}`,
            amount: (i + 1) * 10,
            paid_by_user_id: testUsers[0].id,
            created_by: testUsers[0].id,
            category: 'food',
          })
          .select()
          .single();

        return { data, error };
      });

      const results = await Promise.all(promises);

      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;
      const errors = results.filter(r => r.error).map(r => r.error);

      console.log(`Expense creation: ${successCount} succeeded, ${errorCount} failed`);
      if (errors.length > 0) {
        console.log('First expense error:', JSON.stringify(errors[0], null, 2));
      }
      expect(successCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Query Performance', () => {
    it('should fetch groups efficiently', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) throw signInError;

      const start = Date.now();

      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .order('created_at', { ascending: false });

      const duration = Date.now() - start;

      console.log(`Groups query took ${duration}ms, returned ${data?.length || 0} groups`);

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000);
    });

    it('should fetch expenses with joins efficiently', async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) throw signInError;

      const start = Date.now();

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          paid_by_profile:profiles!paid_by_user_id(id, full_name, avatar_url),
          group:groups(id, name),
          expense_splits(*)
        `)
        .order('expense_date', { ascending: false })
        .limit(50);

      const duration = Date.now() - start;

      console.log(`Expenses query took ${duration}ms, returned ${data?.length || 0} expenses`);

      expect(error).toBeNull();
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('RLS Policy Verification', () => {
    it('should prevent unauthorized access to groups', async () => {
      if (testGroups.length < 5) {
        console.log('Not enough groups for RLS test');
        return;
      }

      // Sign in as testUsers[4] who was never added to any group
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[4].email,
        password: testUsers[4].password,
      });

      if (signInError) throw signInError;

      // Try to access testUsers[0]'s group (which testUsers[4] is not a member of)
      const otherUserGroup = testGroups.find(g => g.name.includes(testUsers[0].email));

      if (!otherUserGroup) {
        console.log('No suitable group found for RLS test');
        return;
      }

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', otherUserGroup.id)
        .single();

      // Should return no data because testUsers[4] is not a member
      expect(data).toBeNull();
    });

    it('should allow access to own groups', async () => {
      if (testGroups.length === 0) {
        console.log('No groups available for RLS test');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsers[0].email,
        password: testUsers[0].password,
      });

      if (signInError) throw signInError;

      const ownGroup = testGroups.find(g => g.name.includes(testUsers[0].email));

      if (!ownGroup) {
        console.log('No own group found for RLS test');
        return;
      }

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', ownGroup.id)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data?.id).toBe(ownGroup.id);
    });
  });
});
