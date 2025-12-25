import { createClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, afterEach } from 'vitest';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required for testing');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const testUsers = {
    user1: {
        email: 'test.user1@fairpay.test',
        password: 'TestPassword123!',
        full_name: 'Test User One',
    },
    user2: {
        email: 'test.user2@fairpay.test',
        password: 'TestPassword123!',
        full_name: 'Test User Two',
    },
    user3: {
        email: 'test.user3@fairpay.test',
        password: 'TestPassword123!',
        full_name: 'Test User Three',
    },
};

export const createTestUser = async (userData: typeof testUsers.user1) => {
    const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                full_name: userData.full_name,
            },
        },
    });

    if (error) throw error;
    return data;
};

export const signInTestUser = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data;
};

export const signOutTestUser = async () => {
    await supabase.auth.signOut();
};

export const cleanupTestUser = async (userId: string) => {
    if (!userId) return;

    await supabase.from('profiles').delete().eq('id', userId);

    try {
        await supabase.auth.admin.deleteUser(userId);
    } catch (error) {
        // Ignore errors during cleanup
        console.warn(`Failed to delete user ${userId}:`, error);
    }
};

export const cleanupTestData = async () => {
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expense_splits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('attachments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('friendships').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

beforeAll(async () => {
    console.log('Setting up test environment...');

    // Clean up any existing test users from previous runs
    try {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const testEmails = Object.values(testUsers).map(u => u.email);

        for (const user of users || []) {
            if (testEmails.includes(user.email || '')) {
                await supabase.from('profiles').delete().eq('id', user.id);
                await supabase.auth.admin.deleteUser(user.id);
            }
        }
    } catch (error) {
        console.warn('Failed to cleanup existing test users:', error);
    }
});

afterEach(async () => {
    await signOutTestUser();
});

afterAll(async () => {
    console.log('Cleaning up test environment...');
    await cleanupTestData();
});
