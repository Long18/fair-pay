import { readFileSync } from "node:fs";
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
});
