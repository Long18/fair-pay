import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '../setup';

describe('REST API Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  let accessToken: string;
  const baseUrl = 'http://127.0.0.1:54321';

  beforeAll(async () => {
    testUserEmail = `rest-api-test-${Date.now()}@example.com`;
    const password = 'RestApiTest123!';

    const { data, error } = await supabase.auth.signUp({
      email: testUserEmail,
      password,
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }

    testUserId = data.user.id;

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password,
    });

    if (signInError || !sessionData.session) {
      throw new Error(`Failed to sign in: ${signInError?.message}`);
    }

    accessToken = sessionData.session.access_token;
    console.log('Test user created and authenticated');
  });

  afterAll(async () => {
    if (testUserId) {
      await supabase.from('profiles').delete().eq('id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Authentication Endpoints', () => {
    it('should return user info with valid token', async () => {
      const response = await fetch(`${baseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe(testUserId);
      expect(data.email).toBe(testUserEmail);
    });

    it('should return 403 without token', async () => {
      const response = await fetch(`${baseUrl}/auth/v1/user`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Groups REST API', () => {
    let testGroupId: string;

    it('should create a group via REST API', async () => {
      const response = await fetch(`${baseUrl}/rest/v1/groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          name: 'REST API Test Group',
          created_by: testUserId,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0].name).toBe('REST API Test Group');
      testGroupId = data[0].id;
    });

    it('should fetch groups via REST API', async () => {
      const response = await fetch(`${baseUrl}/rest/v1/groups?select=*`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should update group via REST API', async () => {
      if (!testGroupId) {
        console.log('No test group available for update');
        return;
      }

      const response = await fetch(`${baseUrl}/rest/v1/groups?id=eq.${testGroupId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          name: 'REST API Test Group (Updated)',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data[0].name).toBe('REST API Test Group (Updated)');
    });

    it('should delete group via REST API', async () => {
      if (!testGroupId) {
        console.log('No test group available for deletion');
        return;
      }

      const response = await fetch(`${baseUrl}/rest/v1/groups?id=eq.${testGroupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      expect(response.status).toBe(204);
    });
  });

  describe('Expenses REST API', () => {
    let testGroupId: string;
    let testExpenseId: string;

    beforeAll(async () => {
      const { data, error } = await supabase
        .from('groups')
        .insert({
          name: 'Expense Test Group',
          created_by: testUserId,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to create test group: ${error?.message}`);
      }

      testGroupId = data.id;
    });

    it('should create expense via REST API', async () => {
      const response = await fetch(`${baseUrl}/rest/v1/expenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          context_type: 'group',
          group_id: testGroupId,
          description: 'REST API Test Expense',
          amount: 100,
          paid_by_user_id: testUserId,
          created_by: testUserId,
          category: 'food',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data[0].description).toBe('REST API Test Expense');
      testExpenseId = data[0].id;
    });

    it('should fetch expenses via REST API', async () => {
      const response = await fetch(`${baseUrl}/rest/v1/expenses?select=*&group_id=eq.${testGroupId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle rapid sequential requests', async () => {
      const promises = Array.from({ length: 20 }, async (_, i) => {
        const response = await fetch(`${baseUrl}/rest/v1/groups?select=*`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
          },
        });
        return { status: response.status, index: i };
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status === 200).length;
      const errorCount = results.filter(r => r.status !== 200).length;

      console.log(`Rapid requests: ${successCount} succeeded, ${errorCount} failed`);
      expect(successCount).toBeGreaterThan(15);
    }, 30000);
  });
});

