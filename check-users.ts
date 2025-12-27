import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321'\;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  console.log('🔍 Checking all users in database...\n');
  
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ No users found in database!');
    return;
  }

  console.log(`✅ Found ${users.length} users:\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.full_nameo name'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);
  });
}

checkUsers();
