#!/usr/bin/env node
/**
 * API Catalog Generator
 * Regenerates src/modules/admin/api-docs/catalog.generated.ts from source files.
 *
 * Run with: node --import jiti/register scripts/generate-api-catalog.ts
 * Or add to package.json scripts: "generate:api-catalog": "node --import jiti/register scripts/generate-api-catalog.ts"
 *
 * Sources parsed (in order):
 *  1. api/**\/*.{ts,tsx}           → HTTP (Vercel routes)
 *  2. supabase/functions/*\/index.ts → HTTP (Edge Functions)
 *  3. supabase/migrations/*.sql + baseline.sql + production-schema.sql → RPC (SQL)
 *  4. src/**\/*.{ts,tsx}           → used_in_code detection (.rpc("name"))
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { globSync } from 'glob'

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'src/modules/admin/api-docs/catalog.generated.ts')

// ─── Types (inline to avoid import issues) ────────────────────────────────────

interface Entry {
  id: string
  kind: 'http' | 'rpc'
  name: string
  method?: string
  path?: string
  function_name?: string
  source_files: string[]
  auth_level: string
  roles_allowed: string[]
  callability: string
  risk: string
  used_in_code: boolean
  status: string
  tags: string[]
  summary: string
  description?: string
  params: unknown[]
  response_examples: unknown[]
  provenance: string[]
}

// ─── Detect used RPC names from src/ ─────────────────────────────────────────

function detectUsedRpcNames(): Set<string> {
  const used = new Set<string>()
  const files = globSync('src/**/*.{ts,tsx}', { cwd: ROOT })
  const rpcCallPattern = /\.rpc\(['"]([a-z_][a-z_0-9]*)['"]|\brpc\(['"]([a-z_][a-z_0-9]*)['"]/g
  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8')
    let m: RegExpExecArray | null
    while ((m = rpcCallPattern.exec(content)) !== null) {
      const name = m[1] ?? m[2]
      if (name) used.add(name)
    }
  }
  return used
}

// ─── Parse Vercel API routes ──────────────────────────────────────────────────

function parseVercelRoutes(usedRpcNames: Set<string>): Entry[] {
  const files = globSync('api/**/*.{ts,tsx}', { cwd: ROOT })
  const entries: Entry[] = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8')
    // Detect HTTP method from handler body
    const methods: string[] = []
    if (/req\.method\s*!==\s*['"]GET['"]/.test(content) || /req\.method\s*===\s*['"]GET['"]/.test(content)) methods.push('GET')
    if (/req\.method\s*!==\s*['"]POST['"]/.test(content) || /req\.method\s*===\s*['"]POST['"]/.test(content)) methods.push('POST')
    if (methods.length === 0) methods.push('GET') // default

    // Build path from file path: api/debt/all-users-summary.ts → /api/debt/all-users-summary
    const routePath = '/' + file.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '')

    const slug = file.replace(/[/.]/g, '-').replace(/^-/, '').replace(/-ts$|-tsx$/, '')
    const name = path.basename(file, path.extname(file))

    const isWebhook = file.includes('webhook')
    const isOg = file.includes('og')

    entries.push({
      id: `http-${slug}`,
      kind: 'http',
      name: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      method: methods[0],
      path: routePath,
      source_files: [file],
      auth_level: isWebhook || isOg ? 'public' : 'admin',
      roles_allowed: isWebhook || isOg ? [] : ['admin'],
      callability: isWebhook ? 'disabled' : isOg ? 'direct_http' : 'proxy_admin',
      risk: isWebhook ? 'critical' : 'low',
      used_in_code: false, // HTTP routes aren't called via .rpc()
      status: 'active',
      tags: file.includes('debt') ? ['debt', 'admin'] : isWebhook ? ['webhook'] : isOg ? ['og'] : [],
      summary: `${methods[0]} ${routePath}`,
      params: [],
      response_examples: [],
      provenance: ['code'],
    })
  }

  return entries
}

// ─── Parse Edge Functions ─────────────────────────────────────────────────────

function parseEdgeFunctions(): Entry[] {
  const files = globSync('supabase/functions/*/index.ts', { cwd: ROOT })
  const entries: Entry[] = []

  for (const file of files) {
    const fnName = path.basename(path.dirname(file))
    const slug = fnName.replace(/-/g, '-')

    const isCron = fnName.includes('process') || fnName.includes('send-email')
    const isWebhook = fnName.includes('webhook')
    const isPublic = fnName.includes('webhook') || fnName.includes('public')

    entries.push({
      id: `edge-${slug}`,
      kind: 'http',
      name: `Edge: ${fnName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
      method: 'POST',
      path: `/functions/v1/${fnName}`,
      source_files: [file],
      auth_level: isCron ? 'service_role' : isPublic ? 'public' : 'authenticated',
      roles_allowed: isCron ? ['service_role'] : isPublic ? [] : ['authenticated'],
      callability: isWebhook || isCron ? 'proxy_admin' : 'direct_http',
      risk: isCron ? 'high' : isWebhook ? 'critical' : 'medium',
      used_in_code: false,
      status: 'active',
      tags: [fnName.split('-')[0], 'edge'],
      summary: `POST /functions/v1/${fnName}`,
      params: [],
      response_examples: [],
      provenance: ['code'],
    })
  }

  return entries
}

// ─── Parse SQL files for RPC names ───────────────────────────────────────────

function parseRpcFromSql(usedRpcNames: Set<string>): Entry[] {
  const sqlFiles = [
    'supabase/baseline.sql',
    'supabase/scripts/sync/dumps/production-schema.sql',
    ...globSync('supabase/migrations/*.sql', { cwd: ROOT }),
  ].filter((f) => fs.existsSync(path.join(ROOT, f)))

  const discovered = new Map<string, { files: string[]; provenance: string[] }>()

  const fnPattern = /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+(?:public\.)?([a-z_][a-z_0-9]*)\s*\(/gi

  for (const file of sqlFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8')
    const provSource = file.includes('baseline') ? 'baseline' : file.includes('dump') || file.includes('production') ? 'dump' : 'migration'

    let m: RegExpExecArray | null
    while ((m = fnPattern.exec(content)) !== null) {
      const fnName = m[1].toLowerCase()
      // Skip trigger utility functions (named like update_*_at_column etc.)
      if (discovered.has(fnName)) {
        discovered.get(fnName)!.files.push(file)
        if (!discovered.get(fnName)!.provenance.includes(provSource)) {
          discovered.get(fnName)!.provenance.push(provSource)
        }
      } else {
        discovered.set(fnName, { files: [file], provenance: [provSource] })
      }
    }
  }

  const entries: Entry[] = []
  const isTrigger = (name: string) =>
    name.startsWith('handle_') || name.startsWith('notify_') ||
    name.startsWith('add_creator') || name.startsWith('auto_create') ||
    name.startsWith('update_') || name.startsWith('on_')

  for (const [fnName, meta] of discovered.entries()) {
    const usedInCode = usedRpcNames.has(fnName)
    const isTrig = isTrigger(fnName)
    const isMutating = /^(settle|delete|update|create|add|insert|remove|toggle|batch|bulk|revert|admin_update|admin_accept|soft_delete|simplify)/.test(fnName)
    const isAdmin = /^(admin_|get_admin|read_admin|get_audit|bulk_|batch_)/.test(fnName)

    entries.push({
      id: `rpc-${fnName.replace(/_/g, '-')}`,
      kind: 'rpc',
      name: fnName,
      function_name: fnName,
      source_files: meta.files,
      auth_level: isTrig ? 'service_role' : isAdmin ? 'admin' : 'authenticated',
      roles_allowed: isTrig ? ['service_role'] : isAdmin ? ['admin'] : ['authenticated'],
      callability: isTrig ? 'disabled' : usedInCode ? 'direct_rpc' : 'direct_rpc',
      risk: isMutating && isAdmin ? 'critical' : isMutating ? 'high' : 'low',
      used_in_code: usedInCode,
      status: usedInCode ? 'active' : isTrig ? 'unverified' : 'unverified',
      tags: [],
      summary: `RPC function: ${fnName}`,
      params: [],
      response_examples: [],
      provenance: meta.provenance,
    })
  }

  return entries
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function generate() {
  console.log('🔍 Detecting used RPC names from src/...')
  const usedRpcNames = detectUsedRpcNames()
  console.log(`   Found ${usedRpcNames.size} used RPC names: ${[...usedRpcNames].join(', ')}`)

  console.log('📡 Parsing Vercel API routes...')
  const vercelEntries = parseVercelRoutes(usedRpcNames)
  console.log(`   Found ${vercelEntries.length} Vercel routes`)

  console.log('⚡ Parsing Supabase Edge Functions...')
  const edgeEntries = parseEdgeFunctions()
  console.log(`   Found ${edgeEntries.length} Edge Functions`)

  console.log('🗄️  Parsing SQL files for RPC functions...')
  const rpcEntries = parseRpcFromSql(usedRpcNames)
  console.log(`   Found ${rpcEntries.length} RPC functions`)

  // Deduplicate by id (prefer earlier entries)
  const seen = new Set<string>()
  const allEntries: Entry[] = []
  for (const entry of [...vercelEntries, ...edgeEntries, ...rpcEntries]) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id)
      allEntries.push(entry)
    }
  }

  console.log(`✅ Total: ${allEntries.length} entries`)

  const output = `// ─── AUTO-GENERATED — DO NOT EDIT ────────────────────────────────────────────
// Generated by: scripts/generate-api-catalog.ts
// Regenerate with: node --import jiti/register scripts/generate-api-catalog.ts
// Last generated: ${new Date().toISOString().split('T')[0]}
//
// Entries: ${allEntries.length} (${vercelEntries.length} Vercel + ${edgeEntries.length} Edge + ${rpcEntries.length} RPC)

import type { ApiCatalogEntry } from './types';

export const generatedCatalog: ApiCatalogEntry[] = ${JSON.stringify(allEntries, null, 2)};
`

  fs.writeFileSync(OUT, output, 'utf-8')
  console.log(`📄 Written to ${path.relative(ROOT, OUT)}`)
}

generate()
