#!/usr/bin/env tsx
/**
 * Reset and Seed Database with Fresh Test Data
 *
 * This script:
 * 1. Clears all test data from the database
 * 2. Creates fresh test users
 * 3. Creates test groups with friendships
 * 4. Creates test expenses with various split methods
 * 5. Creates test payments
 *
 * Usage: tsx scripts/reset-and-seed.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, '../.env.local'), 'utf-8');
    const env: Record<string, string> = {};

    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        env[key] = value;
      }
    });

    return env;
  } catch (error) {
    console.error('❌ Error reading .env.local file');
    throw error;
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Use service role client to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('🚀 Starting database reset and seed...\n');

// Step 1: Clear all test data
async function clearTestData() {
  console.log('🧹 Clearing test data...');

  try {
    // Delete in correct order (respecting foreign keys)
    await supabase.from('expense_splits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('group_members').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('friendships').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Test data cleared successfully\n');
  } catch (error) {
    console.error('❌ Error clearing test data:', error);
    throw error;
  }
}

// Step 2: Get existing users (we can't create auth users via API, they must sign up)
async function getExistingUsers() {
  console.log('👥 Fetching existing users...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ No users found! Please sign up at least one user first.');
    process.exit(1);
  }

  console.log(`✅ Found ${profiles.length} users:`);
  profiles.forEach(u => console.log(`   - ${u.full_name} (${u.email})`));
  console.log('');

  return profiles;
}

// Step 3: Create friendships between all users
async function createFriendships(users: any[]) {
  console.log('🤝 Creating friendships...');

  const friendships = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      friendships.push({
        user_id: users[i].id,
        friend_id: users[j].id,
        status: 'accepted',
      });
    }
  }

  if (friendships.length > 0) {
    const { error } = await supabase.from('friendships').insert(friendships);
    if (error) {
      console.error('❌ Error creating friendships:', error);
      throw error;
    }
    console.log(`✅ Created ${friendships.length} friendships\n`);
  } else {
    console.log('⚠️  Need at least 2 users to create friendships\n');
  }
}

// Step 4: Create test groups
async function createTestGroups(users: any[]) {
  console.log('🏠 Creating test groups...');

  if (users.length < 2) {
    console.log('⚠️  Need at least 2 users to create groups\n');
    return [];
  }

  const groups = [
    {
      name: 'Weekend Trip',
      description: 'Group expenses for weekend getaway',
      created_by: users[0].id,
      currency: 'VND',
    },
    {
      name: 'Apartment Sharing',
      description: 'Shared apartment expenses',
      created_by: users[1 % users.length].id,
      currency: 'VND',
    },
  ];

  const { data: createdGroups, error } = await supabase
    .from('groups')
    .insert(groups)
    .select();

  if (error) {
    console.error('❌ Error creating groups:', error);
    throw error;
  }

  // Add all users as members to all groups
  const groupMembers = [];
  for (const group of createdGroups || []) {
    for (const user of users) {
      groupMembers.push({
        group_id: group.id,
        user_id: user.id,
        role: user.id === group.created_by ? 'admin' : 'member',
      });
    }
  }

  if (groupMembers.length > 0) {
    const { error: membersError } = await supabase.from('group_members').insert(groupMembers);
    if (membersError) {
      console.error('❌ Error adding group members:', membersError);
      throw membersError;
    }
  }

  console.log(`✅ Created ${createdGroups?.length || 0} groups with members\n`);
  return createdGroups || [];
}

// Step 5: Create test expenses
async function createTestExpenses(users: any[], groups: any[]) {
  console.log('💰 Creating test expenses...');

  if (users.length < 2) {
    console.log('⚠️  Need at least 2 users to create expenses\n');
    return;
  }

  const expenses = [
    // Group expense: Weekend Trip
    {
      description: 'Hotel room for 2 nights',
      amount: 1500000,
      currency: 'VND',
      category: 'accommodation',
      paid_by_user_id: users[0].id,
      group_id: groups[0]?.id || null,
      created_by: users[0].id,
      expense_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      split_method: 'equal',
    },
    // Personal expense
    {
      description: 'Dinner at Italian restaurant',
      amount: 800000,
      currency: 'VND',
      category: 'food_drink',
      paid_by_user_id: users[0].id,
      group_id: null,
      created_by: users[0].id,
      expense_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      split_method: 'equal',
    },
    // Group expense with different payer
    {
      description: 'Grocery shopping for group',
      amount: 900000,
      currency: 'VND',
      category: 'food_drink',
      paid_by_user_id: users[1 % users.length].id,
      group_id: groups[0]?.id || null,
      created_by: users[1 % users.length].id,
      expense_date: new Date().toISOString(), // Today
      split_method: 'equal',
    },
  ];

  const { data: createdExpenses, error } = await supabase
    .from('expenses')
    .insert(expenses)
    .select();

  if (error) {
    console.error('❌ Error creating expenses:', error);
    throw error;
  }

  // Create expense splits
  const splits = [];
  for (const expense of createdExpenses || []) {
    if (expense.group_id) {
      // Split among all group members
      const splitAmount = expense.amount / users.length;
      for (const user of users) {
        splits.push({
          expense_id: expense.id,
          user_id: user.id,
          amount: splitAmount,
          computed_amount: splitAmount,
        });
      }
    } else {
      // Personal expense: split between first 2 users
      const participants = users.slice(0, 2);
      const splitAmount = expense.amount / participants.length;
      for (const user of participants) {
        splits.push({
          expense_id: expense.id,
          user_id: user.id,
          amount: splitAmount,
          computed_amount: splitAmount,
        });
      }
    }
  }

  if (splits.length > 0) {
    const { error: splitsError } = await supabase.from('expense_splits').insert(splits);
    if (splitsError) {
      console.error('❌ Error creating expense splits:', splitsError);
      throw splitsError;
    }
  }

  console.log(`✅ Created ${createdExpenses?.length || 0} expenses with splits\n`);
}

// Step 6: Create test payment (settlement)
async function createTestPayment(users: any[], groups: any[]) {
  console.log('💸 Creating test payment...');

  if (users.length < 2) {
    console.log('⚠️  Need at least 2 users to create payment\n');
    return;
  }

  const payment = {
    from_user: users[1 % users.length].id,
    to_user: users[0].id,
    amount: 200000,
    currency: 'VND',
    group_id: groups[0]?.id || null,
    created_by: users[1 % users.length].id,
    notes: 'Settlement for shared expenses',
  };

  const { error } = await supabase.from('payments').insert([payment]);

  if (error) {
    console.error('❌ Error creating payment:', error);
    throw error;
  }

  console.log('✅ Created 1 payment\n');
}

// Main execution
async function main() {
  try {
    // Step 1: Clear all test data
    await clearTestData();

    // Step 2: Get existing users
    const users = await getExistingUsers();

    // Step 3: Create friendships
    await createFriendships(users);

    // Step 4: Create test groups
    const groups = await createTestGroups(users);

    // Step 5: Create test expenses
    await createTestExpenses(users, groups);

    // Step 6: Create test payment
    await createTestPayment(users, groups);

    console.log('🎉 Database reset and seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users (existing)`);
    console.log(`   - ${groups.length} groups`);
    console.log('   - 3 expenses with splits');
    console.log('   - 1 payment');
    console.log('   - Friendships between all users\n');

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();
