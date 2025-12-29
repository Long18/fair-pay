#!/usr/bin/env node

/**
 * Pull Storage Files from Production to Local
 * 
 * This script downloads all files from production storage buckets
 * and uploads them to local Supabase storage.
 * 
 * Usage: node scripts/pull-storage.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Get Supabase credentials
function getSupabaseConfig() {
  try {
    // Try to read from .env.local or environment
    const envPath = join(__dirname, '..', '.env.local');
    let envContent = '';
    
    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch (e) {
      // Try .env
      try {
        envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
      } catch (e2) {
        // Use environment variables
      }
    }
    
    // Parse env file
    const env = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    
    // Get production URL and key from environment or .env
    const prodUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
    const prodKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
    const prodServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Local Supabase (default ports)
    const localUrl = process.env.SUPABASE_LOCAL_URL || 'http://localhost:54321';
    const localKey = process.env.SUPABASE_LOCAL_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    const localServiceKey = process.env.SUPABASE_LOCAL_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
    
    if (!prodUrl || !prodKey) {
      throw new Error('Missing production Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    }
    
    return {
      production: {
        url: prodUrl,
        key: prodServiceKey || prodKey, // Prefer service key for full access
      },
      local: {
        url: localUrl,
        key: localServiceKey,
      },
    };
  } catch (error) {
    log(`Error reading config: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function downloadStorageFiles(prodClient, bucketName, outputDir) {
  log(`\n📥 Downloading files from production bucket: ${bucketName}`, 'blue');
  
  try {
    // List all files in the bucket
    const { data: files, error } = await prodClient.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });
    
    if (error) {
      throw error;
    }
    
    if (!files || files.length === 0) {
      log(`⚠️  No files found in bucket: ${bucketName}`, 'yellow');
      return [];
    }
    
    log(`   Found ${files.length} files`, 'blue');
    
    const downloadedFiles = [];
    
    // Download each file
    for (const file of files) {
      if (file.name) {
        const filePath = file.name;
        const localPath = join(outputDir, filePath);
        const localDir = dirname(localPath);
        
        // Create directory structure
        mkdirSync(localDir, { recursive: true });
        
        // Download file
        const { data, error: downloadError } = await prodClient.storage
          .from(bucketName)
          .download(filePath);
        
        if (downloadError) {
          log(`   ⚠️  Failed to download: ${filePath} - ${downloadError.message}`, 'yellow');
          continue;
        }
        
        // Convert blob to buffer and save
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        writeFileSync(localPath, buffer);
        
        log(`   ✅ Downloaded: ${filePath}`, 'green');
        downloadedFiles.push({ path: filePath, localPath });
      }
    }
    
    return downloadedFiles;
  } catch (error) {
    log(`❌ Error downloading storage: ${error.message}`, 'red');
    throw error;
  }
}

async function uploadStorageFiles(localClient, bucketName, files) {
  log(`\n📤 Uploading files to local bucket: ${bucketName}`, 'blue');
  
  try {
    // Ensure bucket exists
    const { data: buckets } = await localClient.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      log(`   Creating bucket: ${bucketName}`, 'blue');
      const { error: createError } = await localClient.storage.createBucket(bucketName, {
        public: true,
      });
      
      if (createError) {
        throw createError;
      }
    }
    
    // Upload each file
    for (const file of files) {
      const fileContent = readFileSync(file.localPath);
      const { error: uploadError } = await localClient.storage
        .from(bucketName)
        .upload(file.path, fileContent, {
          upsert: true,
        });
      
      if (uploadError) {
        log(`   ⚠️  Failed to upload: ${file.path} - ${uploadError.message}`, 'yellow');
      } else {
        log(`   ✅ Uploaded: ${file.path}`, 'green');
      }
    }
  } catch (error) {
    log(`❌ Error uploading storage: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log('🔄 Pull Storage Files from Production', 'blue');
  log('=====================================\n', 'blue');
  
  const config = getSupabaseConfig();
  
  // Create clients
  const prodClient = createClient(config.production.url, config.production.key);
  const localClient = createClient(config.local.url, config.local.key);
  
  const bucketName = 'receipts';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = join(__dirname, '..', 'supabase', 'backups', 'storage', timestamp);
  
  mkdirSync(outputDir, { recursive: true });
  
  try {
    // Download files
    const downloadedFiles = await downloadStorageFiles(prodClient, bucketName, outputDir);
    
    if (downloadedFiles.length === 0) {
      log('\n⚠️  No files to upload', 'yellow');
      return;
    }
    
    // Ask user if they want to upload to local
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('\n📤 Upload files to local Supabase? (y/N): ', resolve);
    });
    rl.close();
    
    if (answer.toLowerCase() === 'y') {
      await uploadStorageFiles(localClient, bucketName, downloadedFiles);
      log('\n✅ Storage pull complete!', 'green');
    } else {
      log('\n⏭️  Skipped upload. Files are saved in:', 'yellow');
      log(`   ${outputDir}`, 'yellow');
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();

