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

describe('Friendships CRUD Operations', () => {
  let user1Id: string;
  let user2Id: string;
  let testFriendshipId: string;

  beforeAll(async () => {
    const { user: u1 } = await createTestUser(testUsers.user1);
    const { user: u2 } = await createTestUser(testUsers.user2);
    user1Id = u1!.id;
    user2Id = u2!.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupTestUser(user1Id);
    await cleanupTestUser(user2Id);
  });

  describe('CREATE', () => {
    it('should create a friend request', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const orderedIds = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

      const { data: friendship, error } = await supabase
        .from('friendships')
        .insert({
          user_a_id: orderedIds[0],
          user_b_id: orderedIds[1],
          status: 'pending',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(friendship).toBeDefined();
      expect(friendship?.status).toBe('pending');
      expect(friendship?.user_a_id).toBe(orderedIds[0]);
      expect(friendship?.user_b_id).toBe(orderedIds[1]);

      testFriendshipId = friendship!.id;

      await signOutTestUser();
    });

    it('should enforce ordered pair constraint', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const orderedIds = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

      const { error } = await supabase
        .from('friendships')
        .insert({
          user_a_id: orderedIds[1],
          user_b_id: orderedIds[0],
          status: 'pending',
        });

      expect(error).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('READ', () => {
    it('should fetch own friendships', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', testFriendshipId);

      expect(error).toBeNull();
      expect(friendships).toHaveLength(1);

      await signOutTestUser();
    });

    it('should fetch friendship with profiles', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: friendship } = await supabase
        .from('friendships')
        .select('*, user_a_profile:user_a_id(*), user_b_profile:user_b_id(*)')
        .eq('id', testFriendshipId)
        .single();

      expect(friendship?.user_a_profile).toBeDefined();
      expect(friendship?.user_b_profile).toBeDefined();

      await signOutTestUser();
    });

    it('should allow other participant to view friendship', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', testFriendshipId);

      expect(friendships).toHaveLength(1);

      await signOutTestUser();
    });

    it('should NOT allow non-participants to view friendship (RLS)', async () => {
      const { user: u3 } = await createTestUser(testUsers.user3);

      await signInTestUser(testUsers.user3.email, testUsers.user3.password);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', testFriendshipId);

      expect(friendships).toEqual([]);

      await signOutTestUser();
      await cleanupTestUser(u3!.id);
    });
  });

  describe('UPDATE', () => {
    it('should accept friend request', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', testFriendshipId);

      expect(error).toBeNull();

      const { data: friendship } = await supabase
        .from('friendships')
        .select('status')
        .eq('id', testFriendshipId)
        .single();

      expect(friendship?.status).toBe('accepted');

      await signOutTestUser();
    });

    it('should update timestamps on update', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: before } = await supabase
        .from('friendships')
        .select('updated_at')
        .eq('id', testFriendshipId)
        .single();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', testFriendshipId);

      const { data: after } = await supabase
        .from('friendships')
        .select('updated_at')
        .eq('id', testFriendshipId)
        .single();

      expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
        new Date(before!.updated_at).getTime()
      );

      await signOutTestUser();
    });
  });

  describe('DELETE', () => {
    it('should delete friendship', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const orderedIds = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

      const { data: newFriendship } = await supabase
        .from('friendships')
        .insert({
          user_a_id: orderedIds[0],
          user_b_id: orderedIds[1],
          status: 'pending',
        })
        .select()
        .single();

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', newFriendship!.id);

      expect(error).toBeNull();

      await signOutTestUser();
    });
  });

  describe('Helper Functions', () => {
    it('should use get_friendship helper', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data, error } = await supabase.rpc('get_friendship', {
        user1: user1Id,
        user2: user2Id,
      });

      expect(error).toBeNull();
      expect(data).toBe(testFriendshipId);

      await signOutTestUser();
    });

    it('should use are_friends helper', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data, error } = await supabase.rpc('are_friends', {
        user1: user1Id,
        user2: user2Id,
      });

      expect(error).toBeNull();
      expect(data).toBe(true);

      await signOutTestUser();
    });
  });

  describe('RLS Policies', () => {
    it('should require authentication', async () => {
      const { data } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', testFriendshipId);

      expect(data).toEqual([]);
    });

    it('should allow participants to view', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data } = await supabase
        .from('friendships')
        .select('*')
        .eq('id', testFriendshipId);

      expect(data).toHaveLength(1);

      await signOutTestUser();
    });
  });
});
