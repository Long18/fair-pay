import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FUNNEL_MIGRATION = resolve(
  process.cwd(),
  "supabase/migrations/20260719150000_admin_activation_funnel.sql"
);

const REPORTS_MIGRATION = resolve(
  process.cwd(),
  "supabase/migrations/20260719151000_content_reports_moderation.sql"
);

describe("admin activation funnel migration", () => {
  const sql = readFileSync(FUNNEL_MIGRATION, "utf8");

  it("creates staff-gated admin_get_activation_funnel", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_get_activation_funnel");
    expect(sql).toContain("is_staff()");
    expect(sql).toContain("'signups'");
    expect(sql).toContain("'first_expense'");
    expect(sql).toContain("'active_7d'");
  });
});

describe("content reports moderation migration", () => {
  const sql = readFileSync(REPORTS_MIGRATION, "utf8");

  it("creates content_reports with open|resolved|dismissed statuses", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.content_reports");
    expect(sql).toContain("target_type TEXT NOT NULL CHECK (target_type IN ('user', 'group'))");
    expect(sql).toContain("status TEXT NOT NULL DEFAULT 'open'");
    expect(sql).toContain("'open', 'resolved', 'dismissed'");
  });

  it("adds soft ban flag and staff action RPCs", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_list_content_reports");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.admin_action_content_report");
    expect(sql).toContain("is_staff()");
  });
});
