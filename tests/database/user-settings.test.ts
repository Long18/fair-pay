import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupDb, teardownDb, signInUser, supabase } from '../setup';

describe('User Settings CRUD and RLS', () => {
  let user1: any;
  let user2: any;

  beforeAll(async () => {
    await setupDb();
    user1 = await signInUser('user1@example.com', 'password');
    user2 = await signInUser('user2@example.com', 'password');
  });

  beforeEach(async () => {
    // Settings are auto-created by trigger, but let's ensure clean state
    await supabase.from('user_settings').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  });

  afterAll(async () => {
    await teardownDb();
  });

  it('should auto-create default settings for new users', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.user_id).toBe(user1.id);
    expect(data?.default_currency).toBe('VND');
    expect(data?.theme).toBe('system');
    expect(data?.notifications_enabled).toBe(true);
  });

  it('should allow users to view their own settings', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user1.id)
      .single();

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data?.user_id).toBe(user1.id);
  });

  it('should NOT allow users to view other users\' settings', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user2.id);

    expect(error).toBeNull(); // RLS doesn't error, just returns empty
    expect(data).toHaveLength(0);
  });

  it('should allow users to update their own settings', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        default_currency: 'USD',
        theme: 'dark',
        notifications_enabled: false,
      })
      .eq('user_id', user1.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.default_currency).toBe('USD');
    expect(data?.theme).toBe('dark');
    expect(data?.notifications_enabled).toBe(false);
  });

  it('should NOT allow users to update other users\' settings', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({ default_currency: 'USD' })
      .eq('user_id', user2.id)
      .select();

    expect(error).toBeNull(); // RLS prevents update silently
    expect(data).toHaveLength(0);
  });

  it('should update updated_at timestamp on update', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data: before } = await supabase
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', user1.id)
      .single();

    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    await supabase
      .from('user_settings')
      .update({ default_currency: 'EUR' })
      .eq('user_id', user1.id);

    const { data: after } = await supabase
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', user1.id)
      .single();

    expect(new Date(after!.updated_at).getTime()).toBeGreaterThan(new Date(before!.updated_at).getTime());
  });

  it('should handle notification preferences correctly', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        notify_on_expense_added: false,
        notify_on_payment_received: true,
        notify_on_friend_request: false,
        notify_on_group_invite: true,
      })
      .eq('user_id', user1.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.notify_on_expense_added).toBe(false);
    expect(data?.notify_on_payment_received).toBe(true);
    expect(data?.notify_on_friend_request).toBe(false);
    expect(data?.notify_on_group_invite).toBe(true);
  });

  it('should handle privacy settings correctly', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        allow_friend_requests: false,
        allow_group_invites: false,
        profile_visibility: 'private',
      })
      .eq('user_id', user1.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.allow_friend_requests).toBe(false);
    expect(data?.allow_group_invites).toBe(false);
    expect(data?.profile_visibility).toBe('private');
  });

  it('should handle display preferences correctly', async () => {
    await supabase.auth.signInWithPassword({ email: 'user1@example.com', password: 'password' });
    
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        default_currency: 'JPY',
        date_format: 'YYYY-MM-DD',
        theme: 'light',
      })
      .eq('user_id', user1.id)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data?.default_currency).toBe('JPY');
    expect(data?.date_format).toBe('YYYY-MM-DD');
    expect(data?.theme).toBe('light');
  });
});

