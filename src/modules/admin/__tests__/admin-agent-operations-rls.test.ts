import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260623081229_admin_agent_operations_rpcs.sql"),
  "utf8",
);

const forbiddenObjectKeys = [
  "preview_hash",
  "confirmation_id",
  "idempotency_key",
  "response_body",
  "preview_data",
  "jwt",
  "access_token",
] as const;

describe("Phase 4 admin RPC migration security", () => {
  it("creates only the two scoped admin observability RPCs", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_list_agent_operations");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_get_agent_operation_metrics");
    expect(migration.match(/\nSECURITY DEFINER\n/g)).toHaveLength(2);
    expect(migration.match(/SET search_path = ''/g)).toHaveLength(2);
  });

  it("requires both an authenticated actor and the admin role", () => {
    expect(migration.match(/\(SELECT auth\.uid\(\)\) IS NULL OR NOT public\.is_admin\(\)/g)).toHaveLength(2);
  });

  it("revokes default execution before granting authenticated callers", () => {
    expect(migration.match(/FROM PUBLIC, anon, authenticated;/g)).toHaveLength(2);
    expect(migration.match(/TO authenticated;/g)).toHaveLength(2);
    expect(migration).not.toMatch(/TO anon;/);
  });

  it("does not weaken table RLS or grant direct agent table access", () => {
    expect(migration).not.toMatch(/CREATE POLICY/i);
    expect(migration).not.toMatch(/GRANT\s+SELECT\s+ON\s+public\.agent_/i);
    expect(migration).not.toContain("service_role");
  });

  it("returns a scalar allowlist instead of sensitive persistence fields", () => {
    for (const field of forbiddenObjectKeys) {
      expect(migration).not.toMatch(new RegExp(`'${field}'\\s*,`));
    }
    for (const field of [
      "description",
      "total_amount",
      "split_method",
      "payer_full_name",
      "has_confirmation",
      "confirmation_used",
    ]) {
      expect(migration).toMatch(new RegExp(`'${field}'\\s*,`));
    }
  });

  it("bounds pagination, search input, statuses, and date ranges", () => {
    expect(migration).toContain("LEAST(GREATEST(COALESCE(p_limit,  20), 1), 100)");
    expect(migration).toContain("LEFT(BTRIM(p_search), 100)");
    expect(migration).toContain("INVALID_STATUS");
    expect(migration.match(/INVALID_DATE_RANGE/g)).toHaveLength(2);
  });
});
