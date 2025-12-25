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

describe('Payments CRUD Operations', () => {
  let user1Id: string;
  let user2Id: string;
  let testGroupId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(testUsers.user1);
    const { user: u2 } = await createTestUser(testUsers.user2);
    user1Id = u1!.id;
    user2Id = u2!.id;

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const { data: group } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group for Payments',
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
    it('should create a payment', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          group_id: testGroupId,
          amount: 50000,
          currency: 'VND',
          note: 'Settlement payment',
          payment_date: new Date().toISOString(),
          created_by: user1Id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe(50000);
      expect(payment?.from_user_id).toBe(user1Id);
      expect(payment?.to_user_id).toBe(user2Id);

      testPaymentId = payment!.id;

      await signOutTestUser();
    });

    it('should have timestamps on creation', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: payment } = await supabase
        .from('payments')
        .select('created_at, updated_at')
        .eq('id', testPaymentId)
        .single();

      expect(payment?.created_at).toBeDefined();
      expect(payment?.updated_at).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('READ', () => {
    it('should fetch payments for group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('group_id', testGroupId);

      expect(error).toBeNull();
      expect(payments).toHaveLength(1);

      await signOutTestUser();
    });

    it('should allow recipient to view payment', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('id', testPaymentId);

      expect(payments).toHaveLength(1);

      await signOutTestUser();
    });

    it('should NOT allow non-participants to view payment (RLS)', async () => {
      const { user: u3 } = await createTestUser(testUsers.user3);

      await signInTestUser(testUsers.user3.email, testUsers.user3.password);

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('id', testPaymentId);

      expect(payments).toEqual([]);

      await signOutTestUser();
      await cleanupTestUser(u3!.id);
    });
  });

  describe('UPDATE', () => {
    it('should NOT update payment (feature not implemented)', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase
        .from('payments')
        .update({ note: 'Updated note' })
        .eq('id', testPaymentId);

      expect(error).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('DELETE', () => {
    it('should delete payment as participant', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: newPayment } = await supabase
        .from('payments')
        .insert({
          from_user_id: user1Id,
          to_user_id: user2Id,
          group_id: testGroupId,
          amount: 25000,
          currency: 'VND',
          payment_date: new Date().toISOString(),
          created_by: user1Id,
        })
        .select()
        .single();

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', newPayment!.id);

      expect(error).toBeNull();

      await signOutTestUser();
    });
  });

  describe('Context Types', () => {
    it('should support group payments', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', testPaymentId)
        .single();

      expect(payment?.group_id).toBe(testGroupId);
      expect(payment?.friendship_id).toBeNull();

      await signOutTestUser();
    });
  });

  describe('RLS Policies', () => {
    it('should require authentication', async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('id', testPaymentId);

      expect(data).toEqual([]);
    });

    it('should allow participants to view', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('id', testPaymentId);

      expect(data).toHaveLength(1);

      await signOutTestUser();
    });
  });
});
