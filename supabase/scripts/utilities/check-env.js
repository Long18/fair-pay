#!/usr/bin/env node

// Quick script to check which environment variables are being used
console.log('🔍 Checking Environment Configuration\n');
console.log('='.repeat(50));

const envVars = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL || import.meta?.env?.VITE_SUPABASE_URL,
  'VITE_SUPABASE_ANON_KEY': process.env.VITE_SUPABASE_ANON_KEY ?
    process.env.VITE_SUPABASE_ANON_KEY.substring(0, 20) + '...' :
    (import.meta?.env?.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'NOT SET')
};

console.log('\n📋 Current Environment Variables:');
console.log('─'.repeat(50));
Object.entries(envVars).forEach(([key, value]) => {
  const isLocal = value?.includes('127.0.0.1') || value?.includes('localhost');
  const status = isLocal ? '✅ LOCAL' : value ? '⚠️  REMOTE' : '❌ NOT SET';
  console.log(`${key}: ${value || 'NOT SET'} ${status}`);
});

console.log('\n💡 Expected for Local:');
console.log('─'.repeat(50));
console.log('VITE_SUPABASE_URL: http://127.0.0.1:54321 (or http://localhost:54321)');
console.log('VITE_SUPABASE_ANON_KEY: Should start with "eyJ..."');

console.log('\n📝 Note:');
console.log('─'.repeat(50));
console.log('Vite loads .env.local first, then .env');
console.log('Check your .env.local file for local development');
