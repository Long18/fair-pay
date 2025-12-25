import { createClient } from '@refinedev/supabase';

// Use local Supabase instance
const SUPABASE_URL = 'http://127.0.0.1:54321';
// Default anon key for local Supabase
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
  },
});

interface RequestLog {
  timestamp: number;
  method: string;
  url: string;
  duration: number;
  status: 'success' | 'error';
}

const requestLogs: RequestLog[] = [];

function logRequest(method: string, url: string, duration: number, status: 'success' | 'error') {
  requestLogs.push({
    timestamp: Date.now(),
    method,
    url,
    duration,
    status,
  });
}

async function testAuthFlow() {
  console.log('\n=== Testing Authentication Flow ===');

  const testEmail = `frontend-test-${Date.now()}@example.com`;
  const testPassword = 'FrontendTest123!';
  let userId: string | undefined;

  try {
    // Register
    console.log('1. Registering user...');
    const start1 = Date.now();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    const duration1 = Date.now() - start1;
    logRequest('POST', '/auth/v1/signup', duration1, signUpError ? 'error' : 'success');

    if (signUpError) throw signUpError;
    userId = signUpData.user?.id;
    console.log(`✅ User registered (${duration1}ms)`);

    // Sign in
    console.log('2. Signing in...');
    const start2 = Date.now();
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    const duration2 = Date.now() - start2;
    logRequest('POST', '/auth/v1/token', duration2, signInError ? 'error' : 'success');

    if (signInError) throw signInError;
    console.log(`✅ User signed in (${duration2}ms)`);

    // Get session
    console.log('3. Getting session...');
    const start3 = Date.now();
    const { data: sessionData } = await supabase.auth.getSession();
    const duration3 = Date.now() - start3;
    logRequest('GET', '/auth/v1/session', duration3, 'success');
    console.log(`✅ Session retrieved (${duration3}ms)`);

    return { userId, session: sessionData.session };
  } catch (error) {
    console.error('❌ Auth flow failed:', error);
    throw error;
  }
}

async function testGroupOperations(userId: string) {
  console.log('\n=== Testing Group Operations ===');

  try {
    // Create group
    console.log('1. Creating group...');
    const start1 = Date.now();
    const { data: group, error: createError } = await supabase
      .from('groups')
      .insert({
        name: 'Frontend Test Group',
        created_by: userId,
      })
      .select()
      .single();
    const duration1 = Date.now() - start1;
    logRequest('POST', '/rest/v1/groups', duration1, createError ? 'error' : 'success');

    if (createError || !group) throw createError || new Error('No group returned');
    console.log(`✅ Group created (${duration1}ms)`);

    // Fetch groups
    console.log('2. Fetching groups...');
    const start2 = Date.now();
    const { data: groups, error: fetchError } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false });
    const duration2 = Date.now() - start2;
    logRequest('GET', '/rest/v1/groups', duration2, fetchError ? 'error' : 'success');

    if (fetchError) throw fetchError;
    console.log(`✅ Groups fetched: ${groups?.length || 0} groups (${duration2}ms)`);

    // Update group
    console.log('3. Updating group...');
    const start3 = Date.now();
    const { error: updateError } = await supabase
      .from('groups')
      .update({ name: 'Frontend Test Group (Updated)' })
      .eq('id', group.id);
    const duration3 = Date.now() - start3;
    logRequest('PATCH', '/rest/v1/groups', duration3, updateError ? 'error' : 'success');

    if (updateError) throw updateError;
    console.log(`✅ Group updated (${duration3}ms)`);

    return group.id;
  } catch (error) {
    console.error('❌ Group operations failed:', error);
    throw error;
  }
}

async function testExpenseOperations(userId: string, groupId: string) {
  console.log('\n=== Testing Expense Operations ===');

  try {
    // Create expense
    console.log('1. Creating expense...');
    const start1 = Date.now();
    const { data: expense, error: createError } = await supabase
      .from('expenses')
      .insert({
        context_type: 'group',
        group_id: groupId,
        description: 'Frontend Test Expense',
        amount: 100,
        paid_by_user_id: userId,
        created_by: userId,
        category: 'food',
      })
      .select()
      .single();
    const duration1 = Date.now() - start1;
    logRequest('POST', '/rest/v1/expenses', duration1, createError ? 'error' : 'success');

    if (createError || !expense) throw createError || new Error('No expense returned');
    console.log(`✅ Expense created (${duration1}ms)`);

    // Fetch expenses with joins
    console.log('2. Fetching expenses with joins...');
    const start2 = Date.now();
    const { data: expenses, error: fetchError } = await supabase
      .from('expenses')
      .select(`
        *,
        paid_by_profile:profiles!paid_by_user_id(id, full_name, avatar_url),
        group:groups(id, name),
        expense_splits(*)
      `)
      .eq('group_id', groupId)
      .order('expense_date', { ascending: false });
    const duration2 = Date.now() - start2;
    logRequest('GET', '/rest/v1/expenses', duration2, fetchError ? 'error' : 'success');

    if (fetchError) throw fetchError;
    console.log(`✅ Expenses fetched: ${expenses?.length || 0} expenses (${duration2}ms)`);

    // Delete expense
    console.log('3. Deleting expense...');
    const start3 = Date.now();
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expense.id);
    const duration3 = Date.now() - start3;
    logRequest('DELETE', '/rest/v1/expenses', duration3, deleteError ? 'error' : 'success');

    if (deleteError) throw deleteError;
    console.log(`✅ Expense deleted (${duration3}ms)`);
  } catch (error) {
    console.error('❌ Expense operations failed:', error);
    throw error;
  }
}

async function cleanup(userId: string, groupId: string) {
  console.log('\n=== Cleaning up ===');

  try {
    await supabase.from('groups').delete().eq('id', groupId);
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.auth.admin.deleteUser(userId);
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.error('⚠️  Cleanup failed:', error);
  }
}

function analyzeRequests() {
  console.log('\n=== Request Pattern Analysis ===');

  const totalRequests = requestLogs.length;
  const successCount = requestLogs.filter(r => r.status === 'success').length;
  const errorCount = requestLogs.filter(r => r.status === 'error').length;
  const avgDuration = requestLogs.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
  const maxDuration = Math.max(...requestLogs.map(r => r.duration));
  const minDuration = Math.min(...requestLogs.map(r => r.duration));

  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Success: ${successCount} (${(successCount/totalRequests*100).toFixed(1)}%)`);
  console.log(`Errors: ${errorCount} (${(errorCount/totalRequests*100).toFixed(1)}%)`);
  console.log(`\nPerformance:`);
  console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min: ${minDuration}ms`);
  console.log(`  Max: ${maxDuration}ms`);

  console.log(`\nRequest Breakdown:`);
  const methodCounts = requestLogs.reduce((acc, r) => {
    const key = `${r.method} ${r.url}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(methodCounts).forEach(([key, count]) => {
    console.log(`  ${key}: ${count}x`);
  });

  // Check for potential issues
  console.log(`\n=== Potential Issues ===`);

  const slowRequests = requestLogs.filter(r => r.duration > 1000);
  if (slowRequests.length > 0) {
    console.log(`⚠️  ${slowRequests.length} slow requests (>1s)`);
    slowRequests.forEach(r => {
      console.log(`   ${r.method} ${r.url}: ${r.duration}ms`);
    });
  } else {
    console.log('✅ No slow requests detected');
  }

  if (errorCount > 0) {
    console.log(`❌ ${errorCount} failed requests`);
  } else {
    console.log('✅ No failed requests');
  }
}

async function main() {
  console.log('🚀 Starting Frontend Integration Tests\n');

  try {
    const { userId, session } = await testAuthFlow();

    if (!userId || !session) {
      throw new Error('Auth flow did not return user or session');
    }

    const groupId = await testGroupOperations(userId);
    await testExpenseOperations(userId, groupId);

    analyzeRequests();

    await cleanup(userId, groupId);

    console.log('\n✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    analyzeRequests();
    process.exit(1);
  }
}

main();
