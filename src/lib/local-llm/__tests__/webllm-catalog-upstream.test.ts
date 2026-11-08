import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { describe, expect, it } from "vitest";

import { WEB_LLM_MODEL_LIST } from "../types";

describe("WebLLM catalog ↔ prebuiltAppConfig", () => {
  it("lists only model ids that exist in the installed @mlc-ai/web-llm package", () => {
    const upstreamIds = new Set(prebuiltAppConfig.model_list.map((m) => m.model_id));
    const unknown = WEB_LLM_MODEL_LIST.filter((m) => !upstreamIds.has(m.id)).map((m) => m.id);
    expect(unknown, `Unknown catalog ids: ${unknown.join(", ")}`).toEqual([]);
  });
});
