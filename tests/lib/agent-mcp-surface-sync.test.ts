import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAMES } from "@/modules/ai-chat/orchestrator/tool-definitions";
import { FORBIDDEN_MCP_TOOLS } from "@/modules/ai-chat/orchestrator/mcp-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const edgeToolsPath = join(
  __dirname,
  "../../supabase/functions/fairpay-agent-mcp/tools.ts",
);

function parseEdgeMcpToolNames(source: string): string[] {
  const match = source.match(/export const MCP_TOOLS[^=]*=\s*\[([\s\S]*?)\n\]/);
  if (!match) {
    throw new Error("Could not parse edge MCP_TOOLS catalog");
  }

  return [...match[1].matchAll(/^\s+name: '([^']+)'/gm)].map(([, name]) => name);
}

describe("agent MCP surface sync", () => {
  it("keeps edge MCP_TOOLS aligned with in-app MCP_TOOL_NAMES", () => {
    const edgeSource = readFileSync(edgeToolsPath, "utf8");
    const edgeNames = parseEdgeMcpToolNames(edgeSource);
    const clientNames = [...MCP_TOOL_NAMES];

    expect(edgeNames.sort()).toEqual(clientNames.sort());
  });

  it("does not expose forbidden financial tools in either catalog", () => {
    const edgeSource = readFileSync(edgeToolsPath, "utf8");
    const edgeNames = parseEdgeMcpToolNames(edgeSource);
    const clientNames = [...MCP_TOOL_NAMES];

    for (const forbidden of FORBIDDEN_MCP_TOOLS) {
      expect(edgeNames).not.toContain(forbidden);
      expect(clientNames).not.toContain(forbidden);
    }
  });
});
