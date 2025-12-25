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

describe('Groups CRUD Operations', () => {
  let user1Id: string;
  let user2Id: string;
  let testGroupId: string;

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
    it('should create a group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: 'Test Group',
          description: 'A test group',
          created_by: user1Id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(group).toBeDefined();
      expect(group?.name).toBe('Test Group');
      expect(group?.created_by).toBe(user1Id);

      testGroupId = group!.id;

      await signOutTestUser();
    });

    it('should auto-add creator as admin member', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', testGroupId);

      expect(members).toHaveLength(1);
      expect(members?.[0].user_id).toBe(user1Id);
      expect(members?.[0].role).toBe('admin');

      await signOutTestUser();
    });

    it('should have timestamps on creation', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: group } = await supabase
        .from('groups')
        .select('created_at, updated_at')
        .eq('id', testGroupId)
        .single();

      expect(group?.created_at).toBeDefined();
      expect(group?.updated_at).toBeDefined();

      await signOutTestUser();
    });

    it('should have simplify_debts default to true', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: group } = await supabase
        .from('groups')
        .select('simplify_debts')
        .eq('id', testGroupId)
        .single();

      expect(group?.simplify_debts).toBe(true);

      await signOutTestUser();
    });
  });

  describe('READ', () => {
    it('should fetch groups user is member of', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: groups, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', testGroupId);

      expect(error).toBeNull();
      expect(groups).toHaveLength(1);
      expect(groups?.[0].name).toBe('Test Group');

      await signOutTestUser();
    });

    it('should NOT see groups user is not member of (RLS)', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { data: groups } = await supabase
        .from('groups')
        .select('*')
        .eq('id', testGroupId);

      expect(groups).toEqual([]);

      await signOutTestUser();
    });

    it('should fetch group members', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: members, error } = await supabase
        .from('group_members')
        .select('*, profiles:user_id(*)')
        .eq('group_id', testGroupId);

      expect(error).toBeNull();
      expect(members).toHaveLength(1);
      expect(members?.[0].profiles).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('UPDATE', () => {
    it('should update group as member', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase
        .from('groups')
        .update({ name: 'Updated Group Name' })
        .eq('id', testGroupId);

      expect(error).toBeNull();

      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', testGroupId)
        .single();

      expect(group?.name).toBe('Updated Group Name');

      await signOutTestUser();
    });

    it('should update simplify_debts setting', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase
        .from('groups')
        .update({ simplify_debts: false })
        .eq('id', testGroupId);

      expect(error).toBeNull();

      const { data: group } = await supabase
        .from('groups')
        .select('simplify_debts')
        .eq('id', testGroupId)
        .single();

      expect(group?.simplify_debts).toBe(false);

      await signOutTestUser();
    });

    it('should NOT update group as non-member (RLS)', async () => {
      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { error } = await supabase
        .from('groups')
        .update({ name: 'Hacked Group Name' })
        .eq('id', testGroupId);

      expect(error).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('DELETE', () => {
    it('should delete group as creator', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data: newGroup } = await supabase
        .from('groups')
        .insert({
          name: 'Group to Delete',
          created_by: user1Id,
        })
        .select()
        .single();

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', newGroup!.id);

      expect(error).toBeNull();

      const { data: deleted } = await supabase
        .from('groups')
        .select('*')
        .eq('id', newGroup!.id);

      expect(deleted).toEqual([]);

      await signOutTestUser();
    });

    it('should NOT delete group as non-creator (RLS)', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      await supabase.from('group_members').insert({
        group_id: testGroupId,
        user_id: user2Id,
        role: 'member',
      });

      await signOutTestUser();

      await signInTestUser(testUsers.user2.email, testUsers.user2.password);

      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', testGroupId);

      expect(error).toBeDefined();

      await signOutTestUser();
    });
  });

  describe('Group Members', () => {
    it('should add member to group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase.from('group_members').insert({
        group_id: testGroupId,
        user_id: user2Id,
        role: 'member',
      });

      expect(error).toBeNull();

      const { data: members } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', testGroupId);

      expect(members?.length).toBeGreaterThanOrEqual(2);

      await signOutTestUser();
    });

    it('should remove member from group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', testGroupId)
        .eq('user_id', user2Id);

      expect(error).toBeNull();

      await signOutTestUser();
    });
  });

  describe('RLS Policies', () => {
    it('should require authentication', async () => {
      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', testGroupId);

      expect(data).toEqual([]);
    });

    it('should allow member to see group', async () => {
      await signInTestUser(testUsers.user1.email, testUsers.user1.password);

      const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', testGroupId);

      expect(data).toHaveLength(1);

      await signOutTestUser();
    });
  });
});
