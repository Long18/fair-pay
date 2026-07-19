#!/usr/bin/env node
// API Catalog Generator — regenerates src/modules/admin/api-docs/catalog.generated.ts
// Run: pnpm generate:api-catalog
// Sources: api routes (expands [action] HANDLERS), edge functions, SQL RPCs, src rpc usage

import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'src/modules/admin/api-docs/catalog.generated.ts')

function globSync(pattern: string, opts: { cwd: string; ignore?: string[] } = { cwd: ROOT }): string[] {
  const ignore = opts.ignore ?? []
  const matches = fs.globSync(pattern, { cwd: opts.cwd })
  return matches.filter((file) => {
    const normalized = file.replace(/\\/g, '/')
    return !ignore.some((rule) => {
      const prefix = rule.replace(/\*\*$/, '').replace(/\*$/, '')
      return (
        normalized === rule ||
        normalized.startsWith(prefix) ||
        normalized.endsWith(rule.replace(/^\*\*\//, ''))
      )
    })
  })
}

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

function detectUsedRpcNames(): Set<string> {
  const used = new Set<string>()
  const files = globSync('src/**/*.{ts,tsx}', { cwd: ROOT })
  const rpcCallPattern =
    /\.rpc\(['"]([a-z_][a-z_0-9]*)['"]|\brpc\(['"]([a-z_][a-z_0-9]*)['"]/g
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

function detectHttpMethods(content: string): string[] {
  const methods: string[] = []
  const supportedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  for (const method of supportedMethods) {
    if (
      new RegExp(`req\\.method\\s*!==\\s*['"]${method}['"]`).test(content) ||
      new RegExp(`req\\.method\\s*===\\s*['"]${method}['"]`).test(content) ||
      new RegExp(`method\\s*!==\\s*['"]${method}['"]`).test(content) ||
      new RegExp(`method\\s*===\\s*['"]${method}['"]`).test(content)
    ) {
      methods.push(method)
    }
  }
  return methods.length > 0 ? methods : ['GET']
}

/** Expand `api/foo/[action].ts` HANDLERS map into concrete `/api/foo/<action>` entries. */
function extractActionKeys(content: string): string[] {
  const handlersMatch = content.match(/const\s+HANDLERS[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (!handlersMatch) return []
  const keys: string[] = []
  const keyPattern = /(?:['"]([a-z][a-z0-9-]*)['"]|([a-z][a-z0-9-]*))\s*:/g
  let m: RegExpExecArray | null
  while ((m = keyPattern.exec(handlersMatch[1])) !== null) {
    const key = m[1] ?? m[2]
    if (key) keys.push(key)
  }
  return [...new Set(keys)]
}

function titleCaseSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function buildHttpEntry(opts: {
  file: string
  routePath: string
  method: string
  name?: string
}): Entry {
  const { file, routePath, method } = opts
  const slug = routePath.replace(/^\//, '').replace(/[/.]/g, '-')
  const isWebhook = file.includes('webhook') || routePath.includes('webhook')
  const isOg = file.includes('/og/') || routePath.startsWith('/api/og/')
  const isShare = routePath.startsWith('/api/share/')
  const isHealth = routePath === '/api/health' || routePath === '/api/csp-report'
  const isApiConsoleExecute = routePath === '/api/admin/api-console/execute'
  const isAdminPath = routePath.startsWith('/api/admin')

  let callability = 'proxy_admin'
  if (isWebhook || isApiConsoleExecute) callability = 'disabled'
  else if (isOg || isShare || isHealth) callability = 'direct_http'

  let auth_level = 'authenticated'
  if (isWebhook || isOg || isShare || isHealth) auth_level = 'public'
  else if (isAdminPath) auth_level = 'admin'

  const tags: string[] = []
  if (routePath.includes('/debt/')) tags.push('debt')
  if (isWebhook) tags.push('webhook')
  if (isOg) tags.push('og')
  if (isShare) tags.push('share')
  if (isAdminPath) tags.push('admin')
  if (routePath.includes('/momo/')) tags.push('momo', 'payment')
  if (routePath.includes('/email/')) tags.push('email')

  return {
    id: `http-${slug}`,
    kind: 'http',
    name: opts.name ?? titleCaseSlug(path.basename(routePath)),
    method,
    path: routePath,
    source_files: [file],
    auth_level,
    roles_allowed:
      auth_level === 'public' ? [] : auth_level === 'admin' ? ['admin'] : ['authenticated'],
    callability,
    risk: isWebhook ? 'critical' : isAdminPath ? 'medium' : 'low',
    used_in_code: !isWebhook,
    status: 'active',
    tags: [...new Set(tags)],
    summary: `${method} ${routePath}`,
    params: [],
    response_examples: [],
    provenance: ['code'],
  }
}

function parseVercelRoutes(): Entry[] {
  const files = globSync('api/**/*.{ts,tsx}', {
    cwd: ROOT,
    ignore: ['api/_lib/**', 'api/**/*.test.ts', 'api/**/*.spec.ts'],
  })
  const entries: Entry[] = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8')
    const methods = detectHttpMethods(content)
    const routePath = '/' + file.replace(/\.(ts|tsx)$/, '').replace(/\/index$/, '')

    if (file.includes('[action]')) {
      const actions = extractActionKeys(content)
      const baseDir = routePath.replace(/\/\[action]$/, '')
      if (actions.length === 0) {
        console.warn(`   ⚠ No HANDLERS keys found in ${file}; skipping`)
        continue
      }
      for (const action of actions) {
        entries.push(
          buildHttpEntry({
            file,
            routePath: `${baseDir}/${action}`,
            method: methods[0],
            name: titleCaseSlug(action),
          })
        )
      }
      continue
    }

    entries.push(
      buildHttpEntry({
        file,
        routePath,
        method: methods[0],
      })
    )
  }

  return entries
}

function parseEdgeFunctions(): Entry[] {
  const files = globSync('supabase/functions/*/index.ts', { cwd: ROOT })
  const entries: Entry[] = []

  for (const file of files) {
    const fnName = path.basename(path.dirname(file))
    if (fnName.startsWith('_')) continue

    const isWebhook = fnName.includes('webhook')
    const isWorker =
      /process-|send-email|lifecycle|debt-aging|push-notification|worker/.test(fnName)
    const isAgent = /fairpay-agent|external-agent|ai-chat/.test(fnName)

    let callability = 'direct_http'
    if (isWebhook) callability = 'disabled'
    else if (isWorker || isAgent) callability = 'proxy_admin'

    let auth_level = 'authenticated'
    if (isWebhook || fnName === 'track-client-event') auth_level = 'public'
    else if (isWorker) auth_level = 'service_role'

    entries.push({
      id: `edge-${fnName}`,
      kind: 'http',
      name: `Edge: ${titleCaseSlug(fnName)}`,
      method: 'POST',
      path: `/functions/v1/${fnName}`,
      source_files: [file],
      auth_level,
      roles_allowed:
        auth_level === 'public'
          ? []
          : auth_level === 'service_role'
            ? ['service_role']
            : ['authenticated'],
      callability,
      risk: isWorker ? 'high' : isWebhook ? 'critical' : 'medium',
      used_in_code:
        isAgent ||
        fnName.includes('debt') ||
        fnName.includes('sepay') ||
        fnName === 'ai-chat' ||
        fnName === 'track-client-event',
      status: 'active',
      tags: [
        fnName.split('-')[0],
        'edge',
        ...(isAgent ? ['agent'] : []),
        ...(isWorker ? ['worker'] : []),
      ],
      summary: `POST /functions/v1/${fnName}`,
      params: [],
      response_examples: [],
      provenance: ['code'],
    })
  }

  return entries
}

function parseRpcFromSql(usedRpcNames: Set<string>): Entry[] {
  const sqlFiles = [
    'supabase/baseline.sql',
    'supabase/scripts/sync/dumps/production-schema.sql',
    ...globSync('supabase/migrations/*.sql', { cwd: ROOT }),
  ].filter((f) => fs.existsSync(path.join(ROOT, f)))

  const discovered = new Map<string, { files: string[]; provenance: string[] }>()
  const fnPattern =
    /CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+(?:public\.)?([a-z_][a-z_0-9]*)\s*\(/gi

  for (const file of sqlFiles) {
    const content = fs.readFileSync(path.join(ROOT, file), 'utf-8')
    const provSource = file.includes('baseline')
      ? 'baseline'
      : file.includes('dump') || file.includes('production')
        ? 'dump'
        : 'migration'

    let m: RegExpExecArray | null
    while ((m = fnPattern.exec(content)) !== null) {
      const fnName = m[1].toLowerCase()
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
    name.startsWith('handle_') ||
    name.startsWith('notify_') ||
    name.startsWith('add_creator') ||
    name.startsWith('auto_create') ||
    name.startsWith('auto_fill') ||
    name.startsWith('broadcast_') ||
    name.startsWith('log_table') ||
    name.startsWith('update_') ||
    name.startsWith('on_')

  for (const [fnName, meta] of discovered.entries()) {
    const usedInCode = usedRpcNames.has(fnName)
    const isTrig = isTrigger(fnName)
    const isMutating =
      /^(settle|delete|update|create|add|insert|remove|toggle|batch|bulk|revert|admin_update|admin_accept|soft_delete|simplify)/.test(
        fnName
      )
    const isAdmin = /^(admin_|get_admin|read_admin|get_audit|bulk_|batch_)/.test(fnName)

    entries.push({
      id: `rpc-${fnName.replace(/_/g, '-')}`,
      kind: 'rpc',
      name: fnName,
      function_name: fnName,
      source_files: meta.files,
      auth_level: isTrig ? 'service_role' : isAdmin ? 'admin' : 'authenticated',
      roles_allowed: isTrig ? ['service_role'] : isAdmin ? ['admin'] : ['authenticated'],
      callability: isTrig ? 'disabled' : 'direct_rpc',
      risk: isMutating && isAdmin ? 'critical' : isMutating ? 'high' : 'low',
      used_in_code: usedInCode,
      status: usedInCode ? 'active' : 'unverified',
      tags: isTrig ? ['trigger'] : isAdmin ? ['admin'] : [],
      summary: `RPC function: ${fnName}`,
      params: [],
      response_examples: [],
      provenance: meta.provenance,
    })
  }

  return entries
}

function generate() {
  console.log('🔍 Detecting used RPC names from src/...')
  const usedRpcNames = detectUsedRpcNames()
  console.log(`   Found ${usedRpcNames.size} used RPC names`)

  console.log('📡 Parsing Vercel API routes...')
  const vercelEntries = parseVercelRoutes()
  console.log(`   Found ${vercelEntries.length} Vercel routes`)

  console.log('⚡ Parsing Supabase Edge Functions...')
  const edgeEntries = parseEdgeFunctions()
  console.log(`   Found ${edgeEntries.length} Edge Functions`)

  console.log('🗄️  Parsing SQL files for RPC functions...')
  const rpcEntries = parseRpcFromSql(usedRpcNames)
  console.log(`   Found ${rpcEntries.length} RPC functions`)

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
// Regenerate with: pnpm generate:api-catalog
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
