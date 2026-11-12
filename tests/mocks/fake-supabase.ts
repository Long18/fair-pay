/**
 * Minimal in-memory stand-in for @supabase/supabase-js, just enough for the
 * pay2s-* Edge Function tests. Supports the query-builder chains those
 * functions use; it is NOT a general Supabase emulator.
 */

type Row = Record<string, unknown>
type Filter = (row: Row) => boolean
type QueryResult = { data: unknown; error: { message: string } | null }

const NO_AUTO_ID = new Set(['pay2s_connection_secrets', 'pay2s_oauth_states'])

interface FakeDb {
  tables: Record<string, Row[]>
  reset(): void
  table(name: string): Row[]
}

// Held on globalThis so every module instance (vi.resetModules() creates new
// ones, including the one the vi.mock factory imports) shares the same data.
const holder = globalThis as unknown as { __fakeSupabaseDb?: FakeDb }
export const fakeDb: FakeDb = (holder.__fakeSupabaseDb ??= {
  tables: {},
  reset() {
    this.tables = {}
  },
  table(name: string): Row[] {
    return (this.tables[name] ??= [])
  },
})

class Query implements PromiseLike<QueryResult> {
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  private filters: Filter[] = []
  private payload: Row = {}
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {}
  private returning = false

  constructor(private name: string) {}

  select() {
    this.returning = true
    return this
  }
  insert(v: Row) {
    this.op = 'insert'
    this.payload = v
    return this
  }
  update(v: Row) {
    this.op = 'update'
    this.payload = v
    return this
  }
  upsert(v: Row, opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert'
    this.payload = v
    this.upsertOpts = opts
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(k: string, v: unknown) {
    this.filters.push((r) => r[k] === v)
    return this
  }
  neq(k: string, v: unknown) {
    this.filters.push((r) => r[k] !== v)
    return this
  }
  is(k: string, v: null) {
    this.filters.push((r) => (v === null ? r[k] == null : r[k] === v))
    return this
  }
  gt(k: string, v: string) {
    this.filters.push((r) => typeof r[k] === 'string' && (r[k] as string) > v)
    return this
  }
  in(k: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[k]))
    return this
  }
  or() {
    return this // cleanup-only filter in the code under test
  }

  private run(): { rows: Row[]; error: QueryResult['error'] } {
    const table = fakeDb.table(this.name)
    const matches = () => table.filter((r) => this.filters.every((f) => f(r)))

    if (this.op === 'select') return { rows: matches(), error: null }

    if (this.op === 'insert') {
      const row = { ...this.payload }
      if (!NO_AUTO_ID.has(this.name) && !row.id) row.id = crypto.randomUUID()
      table.push(row)
      return { rows: [row], error: null }
    }

    if (this.op === 'update') {
      const hit = matches()
      hit.forEach((r) => Object.assign(r, this.payload))
      return { rows: hit, error: null }
    }

    if (this.op === 'delete') {
      const hit = matches()
      fakeDb.tables[this.name] = table.filter((r) => !hit.includes(r))
      return { rows: hit, error: null }
    }

    // upsert
    const keys = (this.upsertOpts.onConflict ?? 'id').split(',').map((k) => k.trim())
    const existing = table.find((r) => keys.every((k) => r[k] === this.payload[k]))
    if (existing) {
      if (this.upsertOpts.ignoreDuplicates) return { rows: [], error: null }
      Object.assign(existing, this.payload)
      return { rows: [existing], error: null }
    }
    const row = { ...this.payload }
    if (!NO_AUTO_ID.has(this.name) && !row.id) row.id = crypto.randomUUID()
    table.push(row)
    return { rows: [row], error: null }
  }

  maybeSingle(): Promise<QueryResult> {
    const { rows, error } = this.run()
    return Promise.resolve({ data: rows[0] ?? null, error })
  }
  single(): Promise<QueryResult> {
    const { rows, error } = this.run()
    return Promise.resolve(
      rows[0] ? { data: rows[0], error } : { data: null, error: { message: 'No rows' } },
    )
  }

  then<R1 = QueryResult, R2 = never>(
    onfulfilled?: ((value: QueryResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    const { rows, error } = this.run()
    const data = this.op === 'select' || this.returning ? rows : null
    return Promise.resolve({ data, error }).then(onfulfilled, onrejected)
  }
}

export function createFakeClient(_url: string, _key: string, options?: { global?: { headers?: Record<string, string> } }) {
  const authHeader = options?.global?.headers?.Authorization
  return {
    from: (name: string) => new Query(name),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'pay2s_try_acquire_refresh_lease') {
        const row = fakeDb.table('pay2s_connection_secrets').find((r) => r.connection_id === args.p_connection_id)
        if (!row) return { data: false, error: null }
        const lease = row.refresh_lease_until as string | null | undefined
        if (lease && lease > new Date().toISOString()) return { data: false, error: null }
        row.refresh_lease_until = new Date(Date.now() + Number(args.p_lease_seconds ?? 30) * 1000).toISOString()
        return { data: true, error: null }
      }
      return { data: null, error: { message: `unknown rpc ${fn}` } }
    },
    auth: {
      getUser: async () => {
        const userId = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
        return userId ? { data: { user: { id: userId } }, error: null } : { data: { user: null }, error: { message: 'no user' } }
      },
    },
  }
}
