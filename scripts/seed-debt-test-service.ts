import { createClient } from '@supabase/supabase-js';

// Using service role key to bypass RLS for seeding
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDebtTestData() {
  console.log('🌱 Starting to seed debt test data...\n');

  try {
    // ================================================
    // 1. GET OR CREATE MAIN USER
    // ================================================
    console.log('👤 Getting main user from profiles...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: true })
      .limit(1);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('❌ No user found in database!');
      console.log('Please signup/login in the app first.\n');
      process.exit(1);
    }

    const currentUser = profiles[0];
    const currentUserId = currentUser.id;
    console.log(`✅ Using user: ${currentUser.full_name} (${currentUser.email})\n`);

    // ================================================
    // 2. CREATE TEST USERS
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

      if (error && !error.message.includes('duplicate')) {
        console.log(`⚠️  Could not create ${testUser.full_name}: ${error.message}`);
      } else {
        console.log(`✅ ${testUser.full_name}`);
      }
    }
    console.log();

    const aliceId = testUsers[0].id;
    const bobId = testUsers[1].id;
    const charlieId = testUsers[2].id;

    // ================================================
    // 3. CREATE FRIENDSHIPS
    // ================================================
    console.log('🤝 Creating friendships...');

    const friendships = [
      { name: 'Alice', otherId: aliceId },
      { name: 'Bob', otherId: bobId },
      { name: 'Charlie', otherId: charlieId },
    ];

    const friendshipIds: Record<string, string> = {};

    for (const friend of friendships) {
      // Check if friendship already exists
      const userA = currentUserId < friend.otherId ? currentUserId : friend.otherId;
      const userB = currentUserId < friend.otherId ? friend.otherId : currentUserId;

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_a', userA)
        .eq('user_b', userB)
        .single();

      if (existing) {
        friendshipIds[friend.name.toLowerCase()] = existing.id;
        console.log(`✅ Friendship with ${friend.name} (existing)`);
      } else {
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_a: userA,
            user_b: userB,
            status: 'accepted',
            created_by: currentUserId,
          })
          .select('id')
          .single();

        if (error) {
          console.log(`⚠️  Could not create friendship with ${friend.name}: ${error.message}`);
        } else {
          friendshipIds[friend.name.toLowerCase()] = data.id;
          console.log(`✅ Friendship with ${friend.name}`);
        }
      }
    }
    console.log();

    // ================================================
    // 4. CREATE TEST EXPENSES
    // ================================================
    console.log('💰 Creating test expenses...\n');

    // EXPENSE 1: You paid, Alice owes you ₫500,000
    console.log('1️⃣  Dinner at restaurant (You paid, Alice owes you)');
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
    console.log('2️⃣  Movie tickets (Bob paid, you owe Bob)');
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
    console.log('3️⃣  Hotel booking (You paid, Charlie owes you)');
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

    // EXPENSE 4: Alice paid, you owe Alice ₫200,000
    console.log('4️⃣  Coffee and snacks (Alice paid, you owe Alice)');
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

    // EXPENSE 5: Small amount for rounding test
    console.log('5️⃣  Taxi ride (You paid, Bob owes you - rounding test)');
    const { data: expense5, error: e5Error } = await supabase
      .from('expenses')
      .insert({
        context_type: 'friend',
        friendship_id: friendshipIds.bob,
        description: 'Taxi ride home',
        amount: 55000,
        currency: 'VND',
        category: 'transport',
        expense_date: new Date().toISOString().split('T')[0],
        paid_by_user_id: currentUserId,
        created_by: currentUserId,
        is_payment: false,
      })
      .select('id')
      .single();

    if (e5Error) {
      console.error(`   ❌ Error: ${e5Error.message}`);
    } else {
      await supabase.from('expense_splits').insert([
        { expense_id: expense5.id, user_id: currentUserId, split_method: 'equal', computed_amount: 27500 },
        { expense_id: expense5.id, user_id: bobId, split_method: 'equal', computed_amount: 27500 },
      ]);
      console.log('   ✅ Bob owes you: ₫27,500 (rounding test)\n');
    }

    // ================================================
    // 5. VERIFY DEBTS
    // ================================================
    console.log('🔍 Verifying aggregated debts...\n');

    const { data: debts, error: debtsError } = await supabase
      .rpc('get_user_debts_aggregated', { p_user_id: currentUserId });

    if (debtsError) {
      console.error(`❌ Error fetching debts: ${debtsError.message}`);
    } else if (debts && debts.length > 0) {
      console.log('╭──────────────────────────────────────────────╮');
      console.log('│ 📊 EXPECTED DASHBOARD DEBTS (NET AMOUNTS)    │');
      console.log('├──────────────────────────────────────────────┤');

      const owedToYou = debts.filter((d: any) => !d.i_owe_them);
      const youOwe = debts.filter((d: any) => d.i_owe_them);

      if (owedToYou.length > 0) {
        console.log('│ 🔴 OWED TO YOU:                              │');
        owedToYou.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          const name = d.counterparty_name.padEnd(20);
          console.log(`│   ${name} ₫${formatted.padStart(18)} │`);
        });
      }

      if (youOwe.length > 0) {
        console.log('│ 🟢 YOU OWE:                                  │');
        youOwe.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          const name = d.counterparty_name.padEnd(20);
          console.log(`│   ${name} ₫${formatted.padStart(18)} │`);
        });
      }

      console.log('╰──────────────────────────────────────────────╯\n');
    } else {
      console.log('⚠️  No debts found. This might indicate an issue.\n');
    }

    console.log('✅ TEST DATA CREATED SUCCESSFULLY!\n');
    console.log('🔄 Now refresh your dashboard (hard refresh: Cmd+Shift+R)');
    console.log('   You should see debt rows with avatars mixed into the table!\n');
    console.log('Expected visual:');
    console.log('  [A] Alice owes you      | Debt | Now     | ₫300,000');
    console.log('  🧾  Dinner at restaurant | Food | 19h ago | ₫1,000,000');
    console.log('  [B] You owe Bob          | Debt | Now     | ₫272,500');
    console.log('  [C] Charlie owes you     | Debt | Now     | ₫750,000\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDebtTestData();
