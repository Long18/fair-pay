import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDebtTestData() {
  console.log('🌱 Starting to seed debt test data...\n');

  try {
    // First, get the current user (you need to be logged in)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ No authenticated user found!');
      console.log('Please login to the app first, then run this script.\n');
      process.exit(1);
    }

    const currentUserId = user.id;
    console.log(`✅ Current user: ${user.email} (${currentUserId})\n`);

    // ================================================
    // 1. CREATE TEST USERS
    // ================================================
    const testUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'alice.test@fairpay.com',
        full_name: 'Alice Johnson',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'bob.test@fairpay.com',
        full_name: 'Bob Smith',
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'charlie.test@fairpay.com',
        full_name: 'Charlie Brown',
      },
    ];

    console.log('📝 Creating test users...');
    for (const testUser of testUsers) {
      const { error } = await supabase
        .from('profiles')
        .upsert(testUser, { onConflict: 'id' });

      if (error) {
        console.log(`⚠️  Could not create ${testUser.full_name}: ${error.message}`);
      } else {
        console.log(`✅ Created ${testUser.full_name}`);
      }
    }
    console.log();

    const aliceId = testUsers[0].id;
    const bobId = testUsers[1].id;
    const charlieId = testUsers[2].id;

    // ================================================
    // 2. CREATE FRIENDSHIPS
    // ================================================
    console.log('🤝 Creating friendships...');

    const friendships = [
      { name: 'Alice', otherId: aliceId },
      { name: 'Bob', otherId: bobId },
      { name: 'Charlie', otherId: charlieId },
    ];

    const friendshipIds: Record<string, string> = {};

    for (const friend of friendships) {
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_a: currentUserId < friend.otherId ? currentUserId : friend.otherId,
          user_b: currentUserId < friend.otherId ? friend.otherId : currentUserId,
          status: 'accepted',
          created_by: currentUserId,
        })
        .select('id')
        .single();

      if (error && !error.message.includes('duplicate')) {
        console.log(`⚠️  Could not create friendship with ${friend.name}: ${error.message}`);
      } else {
        const fId = data?.id || 'existing';
        friendshipIds[friend.name.toLowerCase()] = fId;
        console.log(`✅ Friendship with ${friend.name}`);
      }
    }
    console.log();

    // ================================================
    // 3. CREATE TEST EXPENSES
    // ================================================
    console.log('💰 Creating test expenses...\n');

    // EXPENSE 1: You paid, Alice owes you ₫500,000
    console.log('1️⃣  Creating: Dinner at restaurant (You paid, Alice owes you)');
    const { data: expense1, error: e1Error } = await supabase
      .from('expenses')
      .insert({
        context_type: 'friend',
        friendship_id: friendshipIds.alice,
        description: 'Dinner at fancy restaurant',
        amount: 1000000,
        currency: 'VND',
        category: 'food',
        expense_date: new Date().toISOString().split('T')[0],
        paid_by_user_id: currentUserId,
        created_by: currentUserId,
        is_payment: false,
      })
      .select('id')
      .single();

    if (e1Error) {
      console.error(`   ❌ Error: ${e1Error.message}`);
    } else {
      await supabase.from('expense_splits').insert([
        { expense_id: expense1.id, user_id: currentUserId, split_method: 'equal', computed_amount: 500000 },
        { expense_id: expense1.id, user_id: aliceId, split_method: 'equal', computed_amount: 500000 },
      ]);
      console.log('   ✅ Alice owes you: ₫500,000\n');
    }

    // EXPENSE 2: Bob paid, you owe Bob ₫300,000
    console.log('2️⃣  Creating: Movie tickets (Bob paid, you owe Bob)');
    const { data: expense2, error: e2Error } = await supabase
      .from('expenses')
      .insert({
        context_type: 'friend',
        friendship_id: friendshipIds.bob,
        description: 'Movie tickets and popcorn',
        amount: 600000,
        currency: 'VND',
        category: 'entertainment',
        expense_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        paid_by_user_id: bobId,
        created_by: bobId,
        is_payment: false,
      })
      .select('id')
      .single();

    if (e2Error) {
      console.error(`   ❌ Error: ${e2Error.message}`);
    } else {
      await supabase.from('expense_splits').insert([
        { expense_id: expense2.id, user_id: bobId, split_method: 'equal', computed_amount: 300000 },
        { expense_id: expense2.id, user_id: currentUserId, split_method: 'equal', computed_amount: 300000 },
      ]);
      console.log('   ✅ You owe Bob: ₫300,000\n');
    }

    // EXPENSE 3: You paid, Charlie owes you ₫750,000
    console.log('3️⃣  Creating: Hotel booking (You paid, Charlie owes you)');
    const { data: expense3, error: e3Error } = await supabase
      .from('expenses')
      .insert({
        context_type: 'friend',
        friendship_id: friendshipIds.charlie,
        description: 'Hotel room for 2 nights',
        amount: 1500000,
        currency: 'VND',
        category: 'accommodation',
        expense_date: new Date().toISOString().split('T')[0],
        paid_by_user_id: currentUserId,
        created_by: currentUserId,
        is_payment: false,
      })
      .select('id')
      .single();

    if (e3Error) {
      console.error(`   ❌ Error: ${e3Error.message}`);
    } else {
      await supabase.from('expense_splits').insert([
        { expense_id: expense3.id, user_id: currentUserId, split_method: 'equal', computed_amount: 750000 },
        { expense_id: expense3.id, user_id: charlieId, split_method: 'equal', computed_amount: 750000 },
      ]);
      console.log('   ✅ Charlie owes you: ₫750,000\n');
    }

    // EXPENSE 4: Alice paid, you owe Alice ₫200,000 (adds to existing debt)
    console.log('4️⃣  Creating: Coffee and snacks (Alice paid, you owe Alice)');
    const { data: expense4, error: e4Error } = await supabase
      .from('expenses')
      .insert({
        context_type: 'friend',
        friendship_id: friendshipIds.alice,
        description: 'Coffee and snacks',
        amount: 400000,
        currency: 'VND',
        category: 'food',
        expense_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        paid_by_user_id: aliceId,
        created_by: aliceId,
        is_payment: false,
      })
      .select('id')
      .single();

    if (e4Error) {
      console.error(`   ❌ Error: ${e4Error.message}`);
    } else {
      await supabase.from('expense_splits').insert([
        { expense_id: expense4.id, user_id: aliceId, split_method: 'equal', computed_amount: 200000 },
        { expense_id: expense4.id, user_id: currentUserId, split_method: 'equal', computed_amount: 200000 },
      ]);
      console.log('   ✅ You owe Alice: ₫200,000\n');
    }

    // ================================================
    // 4. VERIFY DEBTS
    // ================================================
    console.log('🔍 Verifying aggregated debts...\n');

    const { data: debts, error: debtsError } = await supabase
      .rpc('get_user_debts_aggregated', { p_user_id: currentUserId });

    if (debtsError) {
      console.error(`❌ Error fetching debts: ${debtsError.message}`);
    } else {
      console.log('╭────────────────────────────────────────╮');
      console.log('│ 📊 EXPECTED DASHBOARD DEBTS            │');
      console.log('├────────────────────────────────────────┤');

      const owedToYou = debts.filter((d: any) => !d.i_owe_them);
      const youOwe = debts.filter((d: any) => d.i_owe_them);

      if (owedToYou.length > 0) {
        console.log('│ 🔴 OWED TO YOU:                        │');
        owedToYou.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          console.log(`│   ${d.counterparty_name.padEnd(15)} ₫${formatted.padStart(15)} │`);
        });
      }

      if (youOwe.length > 0) {
        console.log('│ 🟢 YOU OWE:                            │');
        youOwe.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          console.log(`│   ${d.counterparty_name.padEnd(15)} ₫${formatted.padStart(15)} │`);
        });
      }

      console.log('╰────────────────────────────────────────╯\n');
    }

    console.log('✅ TEST DATA CREATED SUCCESSFULLY!\n');
    console.log('🔄 Refresh your dashboard to see the debt rows mixed with activities!');
    console.log('   The table should now show user avatars (A, B, C) for debt rows.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDebtTestData();
