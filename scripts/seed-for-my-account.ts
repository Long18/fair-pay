import { createClient } from '@supabase/supabase-js';

// Using service role key to bypass RLS for seeding
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedForSpecificUser() {
  console.log('🌱 Creating test data for: new.test@fairpay.test\n');

  try {
    // ================================================
    // 1. GET YOUR USER ACCOUNT
    // ================================================
    console.log('👤 Looking up your user account...');

    const { data: mainUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'new.test@fairpay.test')
      .single();

    if (userError || !mainUser) {
      console.error('❌ User not found: new.test@fairpay.test');
      console.log('Please make sure you are logged in to the app first.\n');
      process.exit(1);
    }

    const mainUserId = mainUser.id;
    console.log(`✅ Found: ${mainUser.full_name || 'User'} (${mainUser.email})`);
    console.log(`   User ID: ${mainUserId}\n`);

    // ================================================
    // 2. GET EXISTING TEST USERS (Bob, Charlie, etc.)
    // ================================================
    console.log('📝 Looking for existing test users...');

    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or('email.ilike.%bob%,email.ilike.%alice%,email.ilike.%charlie%,email.ilike.%test%')
      .neq('email', 'new.test@fairpay.test')
      .limit(10);

    if (!existingUsers || existingUsers.length === 0) {
      console.log('⚠️  No existing test users found.');
      console.log('Creating placeholder test users...\n');
    } else {
      console.log(`✅ Found ${existingUsers.length} existing test users:`);
      existingUsers.forEach(u => console.log(`   - ${u.full_name} (${u.email})`));
      console.log();
    }

    // Use first 3 existing users or create placeholders
    const alice = existingUsers?.[0];
    const bob = existingUsers?.[1];
    const charlie = existingUsers?.[2];

    // ================================================
    // 3. CREATE FRIENDSHIPS WITH EXISTING USERS
    // ================================================
    console.log('🤝 Creating friendships...\n');

    const friendships: any = {};
    const friends = [
      { user: alice, name: 'Alice' },
      { user: bob, name: 'Bob' },
      { user: charlie, name: 'Charlie' },
    ];

    for (const friend of friends) {
      if (!friend.user) continue;

      const userA = mainUserId < friend.user.id ? mainUserId : friend.user.id;
      const userB = mainUserId < friend.user.id ? friend.user.id : mainUserId;

      // Check if friendship exists
      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_a', userA)
        .eq('user_b', userB)
        .single();

      if (existing) {
        friendships[friend.name.toLowerCase()] = existing.id;
        console.log(`✅ Friendship with ${friend.user.full_name} (existing)`);
      } else {
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_a: userA,
            user_b: userB,
            status: 'accepted',
            created_by: mainUserId,
          })
          .select('id')
          .single();

        if (error) {
          console.log(`⚠️  ${friend.user.full_name}: ${error.message}`);
        } else {
          friendships[friend.name.toLowerCase()] = data.id;
          console.log(`✅ Friendship with ${friend.user.full_name} (created)`);
        }
      }
    }
    console.log();

    // ================================================
    // 4. CREATE TEST GROUP
    // ================================================
    console.log('👥 Creating test group...');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: 'Test Weekend Trip',
        description: 'Sample group expense for testing',
        created_by: mainUserId,
      })
      .select()
      .single();

    if (groupError) {
      console.log(`⚠️  Group creation: ${groupError.message}\n`);
    } else {
      // Add members
      const memberInserts = [alice, bob, charlie]
        .filter(Boolean)
        .map(user => ({
          group_id: group.id,
          user_id: user.id,
          role: 'member',
        }));

      if (memberInserts.length > 0) {
        await supabase.from('group_members').insert(memberInserts);
      }

      console.log(`✅ Test Weekend Trip (${memberInserts.length} members)\n`);
    }

    // ================================================
    // 5. CREATE DIVERSE TEST EXPENSES
    // ================================================
    console.log('💰 Creating test expenses with various split methods...\n');

    const expenses = [];

    // EXPENSE 1: You paid, Alice owes you (Equal split)
    if (alice && friendships.alice) {
      console.log('1️⃣  Restaurant dinner with Alice (50/50 split)');
      const { data: exp1, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.alice,
          description: 'Dinner at Italian restaurant',
          amount: 800000,
          currency: 'VND',
          category: 'food',
          expense_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp1) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp1.id, user_id: mainUserId, split_method: 'equal', computed_amount: 400000 },
          { expense_id: exp1.id, user_id: alice.id, split_method: 'equal', computed_amount: 400000 },
        ]);
        expenses.push(exp1);
        console.log('   ✅ Alice owes you: ₫400,000\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // EXPENSE 2: Bob paid, you owe Bob (Equal split)
    if (bob && friendships.bob) {
      console.log('2️⃣  Movie tickets - Bob paid (You owe Bob)');
      const { data: exp2, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.bob,
          description: 'Movie tickets and popcorn',
          amount: 600000,
          currency: 'VND',
          category: 'entertainment',
          expense_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: bob.id,
          created_by: bob.id,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp2) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp2.id, user_id: bob.id, split_method: 'equal', computed_amount: 300000 },
          { expense_id: exp2.id, user_id: mainUserId, split_method: 'equal', computed_amount: 300000 },
        ]);
        expenses.push(exp2);
        console.log('   ✅ You owe Bob: ₫300,000\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // EXPENSE 3: You paid, Charlie owes you (Large amount)
    if (charlie && friendships.charlie) {
      console.log('3️⃣  Hotel booking - You paid (Charlie owes you)');
      const { data: exp3, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.charlie,
          description: 'Hotel room for 2 nights',
          amount: 1500000,
          currency: 'VND',
          category: 'accommodation',
          expense_date: new Date().toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp3) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp3.id, user_id: mainUserId, split_method: 'equal', computed_amount: 750000 },
          { expense_id: exp3.id, user_id: charlie.id, split_method: 'equal', computed_amount: 750000 },
        ]);
        expenses.push(exp3);
        console.log('   ✅ Charlie owes you: ₫750,000\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // EXPENSE 4: Group expense (Percentage split)
    if (group && alice && bob) {
      console.log('4️⃣  Grocery shopping - Group expense (Percentage split)');
      const { data: exp4, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: group.id,
          description: 'Grocery shopping for group',
          amount: 900000,
          currency: 'VND',
          category: 'shopping',
          expense_date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp4) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp4.id, user_id: mainUserId, split_method: 'percentage', computed_amount: 450000, metadata: { percentage: 50 } },
          { expense_id: exp4.id, user_id: alice.id, split_method: 'percentage', computed_amount: 270000, metadata: { percentage: 30 } },
          { expense_id: exp4.id, user_id: bob.id, split_method: 'percentage', computed_amount: 180000, metadata: { percentage: 20 } },
        ]);
        expenses.push(exp4);
        console.log('   ✅ You: 50%, Alice: 30%, Bob: 20%');
        console.log('   ✅ Alice owes you: ₫270,000, Bob owes you: ₫180,000\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // EXPENSE 5: Small amount for rounding test
    if (alice && friendships.alice) {
      console.log('5️⃣  Coffee - Small amount (Rounding test)');
      const { data: exp5, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.alice,
          description: 'Afternoon coffee',
          amount: 55000,
          currency: 'VND',
          category: 'food',
          expense_date: new Date().toISOString().split('T')[0],
          paid_by_user_id: alice.id,
          created_by: alice.id,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp5) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp5.id, user_id: alice.id, split_method: 'equal', computed_amount: 27500 },
          { expense_id: exp5.id, user_id: mainUserId, split_method: 'equal', computed_amount: 27500 },
        ]);
        expenses.push(exp5);
        console.log('   ✅ You owe Alice: ₫27,500\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // ================================================
    // 6. CREATE PAYMENT SETTLEMENT
    // ================================================
    console.log('💸 Creating payment settlement...\n');

    if (alice && friendships.alice) {
      console.log('💳 Partial payment from Alice');
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.alice,
          from_user_id: alice.id,
          to_user_id: mainUserId,
          amount: 200000,
          currency: 'VND',
          payment_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          notes: 'Partial payment for dinner',
          status: 'completed',
          created_by: alice.id,
        })
        .select()
        .single();

      if (!error && payment) {
        console.log('   ✅ Alice → You: ₫200,000 (bank transfer)\n');
      } else if (error) {
        console.log(`   ❌ ${error.message}\n`);
      }
    }

    // ================================================
    // 7. VERIFY FINAL BALANCES
    // ================================================
    console.log('🔍 Computing your final debts...\n');

    const { data: debts, error: debtsError } = await supabase
      .rpc('get_user_debts_aggregated', { p_user_id: mainUserId });

    if (debtsError) {
      console.error(`❌ Error: ${debtsError.message}\n`);
    } else if (debts && debts.length > 0) {
      console.log('╭────────────────────────────────────────────────────╮');
      console.log('│ 📊 YOUR DASHBOARD DEBTS (After All Transactions)  │');
      console.log('├────────────────────────────────────────────────────┤');

      const owedToYou = debts.filter((d: any) => !d.i_owe_them);
      const youOwe = debts.filter((d: any) => d.i_owe_them);

      if (owedToYou.length > 0) {
        console.log('│ 🔴 PEOPLE WHO OWE YOU:                             │');
        owedToYou.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          const name = d.counterparty_name.padEnd(25);
          console.log(`│   ${name} ₫${formatted.padStart(18)} │`);
        });
      } else {
        console.log('│ 🔴 PEOPLE WHO OWE YOU:                             │');
        console.log('│   (none - all settled up!)                         │');
      }

      if (youOwe.length > 0) {
        console.log('│ 🟢 PEOPLE YOU OWE:                                 │');
        youOwe.forEach((d: any) => {
          const formatted = new Intl.NumberFormat('vi-VN').format(d.amount);
          const name = d.counterparty_name.padEnd(25);
          console.log(`│   ${name} ₫${formatted.padStart(18)} │`);
        });
      } else {
        console.log('│ 🟢 PEOPLE YOU OWE:                                 │');
        console.log('│   (none - all settled up!)                         │');
      }

      console.log('╰────────────────────────────────────────────────────╯\n');

      // Calculate totals
      const totalOwed = owedToYou.reduce((sum: number, d: any) => sum + d.amount, 0);
      const totalOwing = youOwe.reduce((sum: number, d: any) => sum + d.amount, 0);
      const netBalance = totalOwed - totalOwing;

      console.log('📈 SUMMARY:');
      console.log(`   Total owed to you:  ₫${new Intl.NumberFormat('vi-VN').format(totalOwed)}`);
      console.log(`   Total you owe:      ₫${new Intl.NumberFormat('vi-VN').format(totalOwing)}`);
      console.log(`   Net balance:        ₫${new Intl.NumberFormat('vi-VN').format(netBalance)}`);
      console.log(`   Status: ${netBalance > 0 ? '✅ You are owed money' : netBalance < 0 ? '⚠️  You owe money' : '🎉 All settled!'}\n`);
    } else {
      console.log('✅ No outstanding debts - all settled up!\n');
    }

    // ================================================
    // 8. FINAL INSTRUCTIONS
    // ================================================
    console.log('╭────────────────────────────────────────────────────╮');
    console.log('│ ✅ TEST DATA CREATED FOR YOUR ACCOUNT!             │');
    console.log('├────────────────────────────────────────────────────┤');
    console.log(`│ Expenses created:        ${expenses.length}                              │`);
    console.log('│ Payment settlements:     1                              │');
    console.log('│                                                    │');
    console.log('│ Split methods tested:                              │');
    console.log('│   ✓ Equal splits (50/50)                           │');
    console.log('│   ✓ Percentage splits                              │');
    console.log('│   ✓ Rounding edge cases                            │');
    console.log('╰────────────────────────────────────────────────────╯\n');

    console.log('🔄 NEXT STEPS:');
    console.log('1. Go to http://localhost:3000');
    console.log('2. Make sure you are logged in as: new.test@fairpay.test');
    console.log('3. Hard refresh: Cmd + Shift + R');
    console.log('4. Look at the "Recent Activity" table\n');

    console.log('📱 YOU SHOULD SEE:');
    console.log('┌────────────────────────────────────────────────┐');
    console.log('│ [A] Alice owes you    | Debt | Now | ₫470k    │ ← RED');
    console.log('│ [B] Bob owes you      | Debt | Now | ₫180k    │ ← RED');
    console.log('│ [C] Charlie owes you  | Debt | Now | ₫750k    │ ← RED');
    console.log('│ 🧾  Hotel booking     | Food | ...  | ₫1,500k │');
    console.log('│ [B] You owe Bob       | Debt | Now | ₫300k    │ ← GREEN');
    console.log('│ [A] You owe Alice     | Debt | Now | ₫27.5k   │ ← GREEN');
    console.log('└────────────────────────────────────────────────┘\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

seedForSpecificUser();
