import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALLOWED_TRACKING_EVENT_NAMES } from "@/lib/journey-tracking/allowed-events";

const __dirname = dirname(fileURLToPath(import.meta.url));
const edgeAllowlistPath = join(
  __dirname,
  "../../supabase/functions/_shared/allowed-tracking-events.ts",
);

function parseEdgeAllowlist(source: string): string[] {
  const match = source.match(
    /export const ALLOWED_TRACKING_EVENT_NAMES = \[([\s\S]*?)\] as const/,
  );
  if (!match) {
    throw new Error("Could not parse edge allowlist");
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map(([, name]) => name);
}

describe("allowed tracking events sync", () => {
  it("keeps client and edge allowlists aligned", () => {
    const edgeSource = readFileSync(edgeAllowlistPath, "utf8");
    const edgeNames = parseEdgeAllowlist(edgeSource);
    const clientNames = [...ALLOWED_TRACKING_EVENT_NAMES];

    expect(edgeNames.sort()).toEqual(clientNames.sort());
  });

  it("keeps the latest DB check constraint aligned with the client allowlist", () => {
    const migrationsDir = join(__dirname, "../../supabase/migrations");
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith("_expand_user_tracking_event_allowlist.sql"))
      .sort();
    const latest = files.at(-1);
    expect(latest).toBeTruthy();

    const sql = readFileSync(join(migrationsDir, latest!), "utf8");
    const block = sql.match(/event_name IN \(([\s\S]*?)\)/)?.[1];
    expect(block).toBeTruthy();

    const sqlNames = [...block!.matchAll(/'([^']+)'/g)].map(([, name]) => name);
    expect(sqlNames.sort()).toEqual([...ALLOWED_TRACKING_EVENT_NAMES].sort());
  });
});
