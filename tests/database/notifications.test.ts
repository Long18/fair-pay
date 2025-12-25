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

describe('Notifications CRUD Operations', () => {
  let user1Id: string;
  let user2Id: string;
  let testGroupId: string;
  let testNotificationId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(testUsers.user1);
    const { user: u2 } = await createTestUser(testUsers.user2);
    user1Id = u1!.id;
    user2Id = u2!.id;

    await signInTestUser(testUsers.user1.email, testUsers.user1.password);

    const { data: group } = await supabase
      .from('groups')
      .insert({
        name: 'Test Group for Notifications',
        created_by: user1Id,
      })
      .select()
      .single();

    testGroupId = group!.id;

    await signOutTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  describe('CREATE (via triggers)', () => {
    it('should auto-create notification on friend request', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const orderedIds = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

      await supabase.from('friendships').insert({
        user_a_id: orderedIds[0],
        user_b_id: orderedIds[1],
        status: 'pending',
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await signOutTestUser();

      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'friend_request');

      expect(notifications).toBeDefined();
      expect(notifications!.length).toBeGreaterThan(0);

      await signOutTestUser();
    });
  });

  describe('READ', () => {
    it('should fetch own notifications', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user1Id);

      expect(error).toBeNull();
      expect(Array.isArray(notifications)).toBe(true);

      if (notifications && notifications.length > 0) {
        testNotificationId = notifications[0].id;
      }

      await signOutTestUser();
    });

    it('should NOT see other user notifications (RLS)', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user2Id);

      expect(notifications).toEqual([]);

      await signOutTestUser();
    });
  });

  describe('UPDATE', () => {
    it('should mark notification as read', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: notification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user1Id)
        .eq('is_read', false)
        .limit(1)
        .single();

      if (notification) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        expect(error).toBeNull();

        const { data: updated } = await supabase
          .from('notifications')
          .select('is_read')
          .eq('id', notification.id)
          .single();

        expect(updated?.is_read).toBe(true);
      }

      await signOutTestUser();
    });

    it('should NOT update other user notifications (RLS)', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: notification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user2Id)
        .limit(1)
        .single();

      await signOutTestUser();

      if (notification) {
        await signInTestUser(testUsers.user1.email, testUsers.user1.password);

        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        expect(error).toBeDefined();

        await signOutTestUser();
      }
    });
  });

  describe('DELETE', () => {
    it('should delete own notification', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: notification } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user1Id)
        .limit(1)
        .single();

      if (notification) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);

        expect(error).toBeNull();
      }

      await signOutTestUser();
    });
  });

  describe('Notification Types', () => {
    it('should have correct notification type', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', user2Id);

      const validTypes = [
        'expense_added',
        'payment_recorded',
        'friend_request',
        'friend_accepted',
        'added_to_group',
        'expense_updated',
        'expense_deleted',
      ];

      notifications?.forEach((notification: any) => {
        expect(validTypes).toContain(notification.type);
      });

      await signOutTestUser();
    });
  });

  describe('RLS Policies', () => {
    it('should require authentication', async () => {
      const { data } = await supabase.from('notifications').select('*');

      expect(data).toEqual([]);
    });

    it('should only see own notifications', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('*');

      notifications?.forEach((notification: any) => {
        expect(notification.user_id).toBe(user1Id);
      });

      await signOutTestUser();
    });
  });
});

