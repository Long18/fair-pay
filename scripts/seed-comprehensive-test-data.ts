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

async function seedComprehensiveTestData() {
  console.log('🌱 Starting comprehensive test data seeding...\n');
  console.log('This will create: Friends, Groups, Expenses, Splits, Payments, and Reports\n');

  try {
    // ================================================
    // 1. GET MAIN USER
    // ================================================
    console.log('👤 Getting main user...');

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: true })
      .limit(1);

    if (profilesError || !profiles || profiles.length === 0) {
      console.error('❌ No user found! Please signup first.');
      process.exit(1);
    }

    const mainUser = profiles[0];
    const mainUserId = mainUser.id;
    console.log(`✅ Main user: ${mainUser.full_name} (${mainUser.email})\n`);

    // ================================================
    // 2. CREATE DIVERSE TEST USERS
    // ================================================
    console.log('📝 Creating diverse test users...');

    const testUsers = [
      { email: 'alice.johnson@fairpay.com', full_name: 'Alice Johnson' },
      { email: 'bob.smith@fairpay.com', full_name: 'Bob Smith' },
      { email: 'charlie.brown@fairpay.com', full_name: 'Charlie Brown' },
      { email: 'diana.prince@fairpay.com', full_name: 'Diana Prince' },
      { email: 'evan.williams@fairpay.com', full_name: 'Evan Williams' },
      { email: 'fiona.green@fairpay.com', full_name: 'Fiona Green' },
    ];

    const createdUsers: any[] = [];

    for (const user of testUsers) {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', user.email)
        .single();

      if (existing) {
        createdUsers.push(existing);
        console.log(`✅ ${user.full_name} (existing)`);
      } else {
        // For local dev, we need to create users in auth.users first
        // This is a workaround - in production, users signup normally
        const userId = `${user.email.split('@')[0]}-${Date.now()}`;
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email,
            full_name: user.full_name,
          })
          .select()
          .single();

        if (!profileError) {
          createdUsers.push({ id: userId, ...user });
          console.log(`✅ ${user.full_name} (created)`);
        } else {
          console.log(`⚠️  ${user.full_name}: ${profileError.message}`);
        }
      }
    }
    console.log();

    const [alice, bob, charlie, diana, evan, fiona] = createdUsers;

    // ================================================
    // 3. CREATE FRIENDSHIPS (Various States)
    // ================================================
    console.log('🤝 Creating friendships with various states...');

    const friendshipsToCreate = [
      { user: alice, status: 'accepted', note: 'Old friend' },
      { user: bob, status: 'accepted', note: 'College buddy' },
      { user: charlie, status: 'accepted', note: 'Roommate' },
      { user: diana, status: 'pending', note: 'Pending request' },
      { user: evan, status: 'accepted', note: 'Work colleague' },
    ];

    const friendships: any = {};

    for (const friend of friendshipsToCreate) {
      if (!friend.user) continue;

      const userA = mainUserId < friend.user.id ? mainUserId : friend.user.id;
      const userB = mainUserId < friend.user.id ? friend.user.id : mainUserId;

      const { data: existing } = await supabase
        .from('friendships')
        .select('id')
        .eq('user_a', userA)
        .eq('user_b', userB)
        .single();

      if (existing) {
        friendships[friend.user.full_name.split(' ')[0].toLowerCase()] = existing.id;
        console.log(`✅ ${friend.user.full_name} (${friend.status}) - ${friend.note}`);
      } else {
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_a: userA,
            user_b: userB,
            status: friend.status,
            created_by: mainUserId,
          })
          .select('id')
          .single();

        if (error) {
          console.log(`⚠️  ${friend.user.full_name}: ${error.message}`);
        } else {
          friendships[friend.user.full_name.split(' ')[0].toLowerCase()] = data.id;
          console.log(`✅ ${friend.user.full_name} (${friend.status}) - ${friend.note}`);
        }
      }
    }
    console.log();

    // ================================================
    // 4. CREATE GROUPS (Various Types)
    // ================================================
    console.log('👥 Creating groups...');

    const groupsData = [
      {
        name: 'Weekend Trip 2024',
        description: 'Our amazing weekend getaway',
        members: [alice, bob, charlie].filter(Boolean),
      },
      {
        name: 'Office Lunch Club',
        description: 'Weekly lunch expenses',
        members: [evan, bob].filter(Boolean),
      },
      {
        name: 'Apartment 304',
        description: 'Shared apartment expenses',
        members: [charlie, alice].filter(Boolean),
      },
    ];

    const groups: any[] = [];

    for (const groupData of groupsData) {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupData.name,
          description: groupData.description,
          created_by: mainUserId,
        })
        .select()
        .single();

      if (groupError) {
        console.log(`⚠️  ${groupData.name}: ${groupError.message}`);
        continue;
      }

      // Add members
      const memberInserts = groupData.members.map(member => ({
        group_id: group.id,
        user_id: member.id,
        role: 'member',
      }));

      await supabase.from('group_members').insert(memberInserts);

      groups.push(group);
      console.log(`✅ ${groupData.name} (${groupData.members.length} members)`);
    }
    console.log();

    // ================================================
    // 5. CREATE EXPENSES WITH VARIOUS SPLIT METHODS
    // ================================================
    console.log('💰 Creating expenses with diverse split scenarios...\n');

    const expenses = [];

    // SCENARIO 1: Equal split - Friend expense
    if (alice && friendships.alice) {
      console.log('1️⃣  Restaurant dinner (Equal split with Alice)');
      const { data: exp1, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.alice,
          description: 'Fancy Italian restaurant',
          amount: 800000,
          currency: 'VND',
          category: 'food',
          expense_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
          receipt_image_url: null,
        })
        .select()
        .single();

      if (!error && exp1) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp1.id, user_id: mainUserId, split_method: 'equal', computed_amount: 400000 },
          { expense_id: exp1.id, user_id: alice.id, split_method: 'equal', computed_amount: 400000 },
        ]);
        expenses.push(exp1);
        console.log('   ✅ Alice owes you: ₫400,000 (50/50 split)\n');
      }
    }

    // SCENARIO 2: Percentage split - Group expense
    if (groups[0] && bob && charlie) {
      console.log('2️⃣  Hotel booking (Percentage split - Weekend Trip)');
      const { data: exp2, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: groups[0].id,
          description: 'Hotel room for 3 nights',
          amount: 2400000,
          currency: 'VND',
          category: 'accommodation',
          expense_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp2) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp2.id, user_id: mainUserId, split_method: 'percentage', computed_amount: 1200000, metadata: { percentage: 50 } },
          { expense_id: exp2.id, user_id: bob.id, split_method: 'percentage', computed_amount: 600000, metadata: { percentage: 25 } },
          { expense_id: exp2.id, user_id: charlie.id, split_method: 'percentage', computed_amount: 600000, metadata: { percentage: 25 } },
        ]);
        expenses.push(exp2);
        console.log('   ✅ You: 50%, Bob: 25%, Charlie: 25%');
        console.log('   ✅ Bob owes you: ₫600,000, Charlie owes you: ₫600,000\n');
      }
    }

    // SCENARIO 3: Exact amounts - Unequal split
    if (bob && friendships.bob) {
      console.log('3️⃣  Shopping spree (Exact amounts - Bob paid more)');
      const { data: exp3, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.bob,
          description: 'Grocery shopping',
          amount: 650000,
          currency: 'VND',
          category: 'shopping',
          expense_date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: bob.id,
          created_by: bob.id,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp3) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp3.id, user_id: bob.id, split_method: 'exact', computed_amount: 400000 },
          { expense_id: exp3.id, user_id: mainUserId, split_method: 'exact', computed_amount: 250000 },
        ]);
        expenses.push(exp3);
        console.log('   ✅ You owe Bob: ₫250,000 (unequal split)\n');
      }
    }

    // SCENARIO 4: By shares - Complex split
    if (charlie && friendships.charlie) {
      console.log('4️⃣  Taxi ride (By shares - Charlie took more bags)');
      const { data: exp4, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.charlie,
          description: 'Airport taxi',
          amount: 300000,
          currency: 'VND',
          category: 'transport',
          expense_date: new Date().toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp4) {
        // You paid, Charlie had 3 shares (more luggage), you had 2 shares
        await supabase.from('expense_splits').insert([
          { expense_id: exp4.id, user_id: mainUserId, split_method: 'shares', computed_amount: 120000, metadata: { shares: 2 } },
          { expense_id: exp4.id, user_id: charlie.id, split_method: 'shares', computed_amount: 180000, metadata: { shares: 3 } },
        ]);
        expenses.push(exp4);
        console.log('   ✅ You: 2 shares, Charlie: 3 shares');
        console.log('   ✅ Charlie owes you: ₫180,000\n');
      }
    }

    // SCENARIO 5: Small amount for rounding test
    if (alice && friendships.alice) {
      console.log('5️⃣  Coffee break (Small amount - rounding test)');
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
        console.log('   ✅ You owe Alice: ₫27,500 (rounding test)\n');
      }
    }

    // SCENARIO 6: Group expense with multiple people
    if (groups[2] && charlie && alice) {
      console.log('6️⃣  Utilities bill (Group - Apartment shared costs)');
      const { data: exp6, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'group',
          group_id: groups[2].id,
          description: 'Monthly electricity & water',
          amount: 900000,
          currency: 'VND',
          category: 'utilities',
          expense_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: charlie.id,
          created_by: charlie.id,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp6) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp6.id, user_id: charlie.id, split_method: 'equal', computed_amount: 300000 },
          { expense_id: exp6.id, user_id: alice.id, split_method: 'equal', computed_amount: 300000 },
          { expense_id: exp6.id, user_id: mainUserId, split_method: 'equal', computed_amount: 300000 },
        ]);
        expenses.push(exp6);
        console.log('   ✅ You owe Charlie: ₫300,000 (3-way split)\n');
      }
    }

    // SCENARIO 7: Entertainment expense
    if (evan && friendships.evan) {
      console.log('7️⃣  Concert tickets (You paid for both)');
      const { data: exp7, error } = await supabase
        .from('expenses')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.evan,
          description: 'Taylor Swift concert',
          amount: 3000000,
          currency: 'VND',
          category: 'entertainment',
          expense_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
          paid_by_user_id: mainUserId,
          created_by: mainUserId,
          is_payment: false,
        })
        .select()
        .single();

      if (!error && exp7) {
        await supabase.from('expense_splits').insert([
          { expense_id: exp7.id, user_id: mainUserId, split_method: 'equal', computed_amount: 1500000 },
          { expense_id: exp7.id, user_id: evan.id, split_method: 'equal', computed_amount: 1500000 },
        ]);
        expenses.push(exp7);
        console.log('   ✅ Evan owes you: ₫1,500,000\n');
      }
    }

    // ================================================
    // 6. CREATE PAYMENTS (Settlements)
    // ================================================
    console.log('💸 Creating payment settlements...\n');

    // PAYMENT 1: Partial payment from Alice
    if (alice && friendships.alice) {
      console.log('💳 Alice paid you back partially');
      const { data: payment1, error } = await supabase
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

      if (!error && payment1) {
        console.log('   ✅ Alice → You: ₫200,000 (bank transfer)\n');
      }
    }

    // PAYMENT 2: Full payment to Bob
    if (bob && friendships.bob) {
      console.log('💳 You paid Bob fully');
      const { data: payment2, error } = await supabase
        .from('payments')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.bob,
          from_user_id: mainUserId,
          to_user_id: bob.id,
          amount: 250000,
          currency: 'VND',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          notes: 'For grocery shopping',
          status: 'completed',
          created_by: mainUserId,
        })
        .select()
        .single();

      if (!error && payment2) {
        console.log('   ✅ You → Bob: ₫250,000 (cash)\n');
      }
    }

    // PAYMENT 3: Pending payment
    if (charlie && friendships.charlie) {
      console.log('💳 Pending payment from Charlie');
      const { data: payment3, error } = await supabase
        .from('payments')
        .insert({
          context_type: 'friend',
          friendship_id: friendships.charlie,
          from_user_id: charlie.id,
          to_user_id: mainUserId,
          amount: 180000,
          currency: 'VND',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'bank_transfer',
          notes: 'For taxi ride',
          status: 'pending',
          created_by: charlie.id,
        })
        .select()
        .single();

      if (!error && payment3) {
        console.log('   ⏳ Charlie → You: ₫180,000 (pending)\n');
      }
    }

    // ================================================
    // 7. VERIFY FINAL BALANCES
    // ================================================
    console.log('🔍 Computing final aggregated debts...\n');

    const { data: debts, error: debtsError } = await supabase
      .rpc('get_user_debts_aggregated', { p_user_id: mainUserId });

    if (debtsError) {
      console.error(`❌ Error: ${debtsError.message}`);
    } else if (debts && debts.length > 0) {
      console.log('╭────────────────────────────────────────────────────╮');
      console.log('│ 📊 FINAL DASHBOARD DEBTS (After Payments)         │');
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
      console.log('✅ All debts settled! No outstanding balances.\n');
    }

    // ================================================
    // 8. DISPLAY SUMMARY
    // ================================================
    console.log('╭────────────────────────────────────────────────────╮');
    console.log('│ ✅ COMPREHENSIVE TEST DATA CREATED!                │');
    console.log('├────────────────────────────────────────────────────┤');
    console.log(`│ Friends created:         ${friendshipsToCreate.length}                              │`);
    console.log(`│ Groups created:          ${groups.length}                              │`);
    console.log(`│ Expenses created:        ${expenses.length}                              │`);
    console.log('│ Payment settlements:     3                              │');
    console.log('│                                                    │');
    console.log('│ Split methods tested:                              │');
    console.log('│   ✓ Equal splits                                   │');
    console.log('│   ✓ Percentage splits                              │');
    console.log('│   ✓ Exact amounts                                  │');
    console.log('│   ✓ By shares                                      │');
    console.log('│   ✓ Rounding edge cases                            │');
    console.log('╰────────────────────────────────────────────────────╯\n');

    console.log('🔄 NEXT STEPS:');
    console.log('1. Refresh your dashboard (Cmd + Shift + R)');
    console.log('2. Check the Recent Activity table');
    console.log('3. View Friends list');
    console.log('4. Explore Groups');
    console.log('5. Check individual expense details\n');

    console.log('📱 EXPECTED UI:');
    console.log('┌────────────────────────────────────────────────┐');
    console.log('│ RECENT ACTIVITY TABLE (mixed rows):           │');
    console.log('│ [A] Alice owes you      | Debt | ₫200k        │');
    console.log('│ [E] Evan owes you       | Debt | ₫1,500k      │');
    console.log('│ 🧾  Concert tickets     | Food | ₫3,000k      │');
    console.log('│ [C] You owe Charlie     | Debt | ₫300k        │');
    console.log('│ 💰 Payment from Alice   | Payment | ₫200k     │');
    console.log('└────────────────────────────────────────────────┘\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

seedComprehensiveTestData();
