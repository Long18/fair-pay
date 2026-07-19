import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260719120000_admin_agent_ops_show_source.sql"
  ),
  "utf8"
);

const forbiddenObjectKeys = [
  "preview_hash",
  "confirmation_id",
  "idempotency_key",
  "response_body",
  "preview_data",
  "jwt",
  "access_token",
  "submitted_ip_hash",
  "user_agent",
] as const;

describe("admin agent ops show-source migration security", () => {
  it("replaces list RPCs and adds external submission observability", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.admin_list_agent_operations");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_list_external_agent_submissions"
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.admin_get_external_agent_submission_metrics"
    );
    expect(migration.match(/\nSECURITY DEFINER\n/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("requires authenticated admin for every new/updated RPC", () => {
    expect(
      migration.match(/\(SELECT auth\.uid\(\)\) IS NULL OR NOT public\.is_admin\(\)/g)?.length
    ).toBeGreaterThanOrEqual(3);
  });

  it("exposes source for both operations and external submissions", () => {
    expect(migration).toMatch(/'source'\s*,\s*NULLIF\(LEFT\(COALESCE\(ao\.metadata->>'source'/);
    expect(migration).toMatch(/'source'\s*,\s*LEFT\(s\.source, 100\)/);
  });

  it("never returns forbidden persistence fields as object keys", () => {
    for (const field of forbiddenObjectKeys) {
      expect(migration).not.toMatch(new RegExp(`'${field}'\\s*,`));
    }
  });

  it("revokes PUBLIC/anon before granting authenticated", () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_list_external_agent_submissions[\s\S]*?FROM PUBLIC, anon, authenticated/
    );
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_list_external_agent_submissions[\s\S]*?TO authenticated/
    );
  });
});
