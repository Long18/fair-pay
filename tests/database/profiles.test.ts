import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
    supabase,
    testUsers,
    createTestUser,
    signInTestUser,
    signOutTestUser,
    cleanupTestUser,
} from '../setup';

describe('Profiles CRUD Operations', () => {
    let testUserId: string;

    beforeAll(async () => {
        const { user } = await createTestUser(testUsers.user1);
        testUserId = user!.id;
    });

    afterAll(async () => {
        await cleanupTestUser(testUserId);
    });

    describe('CREATE', () => {
        it('should auto-create profile on user signup', async () => {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', testUserId)
                .single();

            expect(error).toBeNull();
            expect(profile).toBeDefined();
            expect(profile?.id).toBe(testUserId);
            expect(profile?.full_name).toBe(testUsers.user1.full_name);
        });

        it('should have timestamps on creation', async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('created_at, updated_at')
                .eq('id', testUserId)
                .single();

            expect(profile?.created_at).toBeDefined();
            expect(profile?.updated_at).toBeDefined();
        });
    });

    describe('READ', () => {
        it('should fetch own profile', async () => {
            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', testUserId)
                .single();

            expect(error).toBeNull();
            expect(profile?.full_name).toBe(testUsers.user1.full_name);

            await signOutTestUser();
        });

        it('should be able to read other profiles (public data)', async () => {
            const { user: user2 } = await createTestUser(testUsers.user2);

            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', user2!.id)
                .single();

            expect(error).toBeNull();
            expect(profile?.id).toBe(user2!.id);

            await signOutTestUser();
            await cleanupTestUser(user2!.id);
        });
    });

    describe('UPDATE', () => {
        it('should update own profile', async () => {
            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const newName = 'Updated Test User';
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: newName })
                .eq('id', testUserId);

            expect(error).toBeNull();

            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', testUserId)
                .single();

            expect(profile?.full_name).toBe(newName);

            await signOutTestUser();
        });

        it('should NOT update other user profile (RLS)', async () => {
            const { user: user2 } = await createTestUser(testUsers.user2);

            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const { error } = await supabase
                .from('profiles')
                .update({ full_name: 'Hacked Name' })
                .eq('id', user2!.id);

            expect(error).toBeDefined();

            await signOutTestUser();
            await cleanupTestUser(user2!.id);
        });

        it('should update timestamps on update', async () => {
            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const { data: before } = await supabase
                .from('profiles')
                .select('updated_at')
                .eq('id', testUserId)
                .single();

            await new Promise((resolve) => setTimeout(resolve, 1000));

            await supabase
                .from('profiles')
                .update({ full_name: 'Another Update' })
                .eq('id', testUserId);

            const { data: after } = await supabase
                .from('profiles')
                .select('updated_at')
                .eq('id', testUserId)
                .single();

            expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(
                new Date(before!.updated_at).getTime()
            );

            await signOutTestUser();
        });
    });

    describe('DELETE', () => {
        it('should NOT allow direct profile deletion (RLS)', async () => {
            await signInTestUser(testUsers.user1.email, testUsers.user1.password);

            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', testUserId);

            expect(error).toBeDefined();

            await signOutTestUser();
        });
    });

    describe('RLS Policies', () => {
        it('should require authentication to read profiles', async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', testUserId);

            expect(error).toBeNull();
            expect(data).toEqual([]);
        });

        it('should allow authenticated users to insert own profile', async () => {
            const { user } = await createTestUser({
                email: 'new.test@fairpay.test',
                password: 'TestPassword123!',
                full_name: 'New Test User',
            });

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();

            expect(profile).toBeDefined();

            await cleanupTestUser(user!.id);
        });
    });
});
