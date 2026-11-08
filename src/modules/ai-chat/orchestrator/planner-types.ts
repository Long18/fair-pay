export type PlannerDecision =
  | { kind: "tool"; name: string; arguments: Record<string, unknown> }
  | { kind: "final"; content: string }
  | { kind: "delegate_llm" };

import type { ReadDigestBag } from "../utils/format-read-digest";

export interface PlannerTurnState {
  lastToolName?: string;
  lastToolData?: unknown;
  selectedGroupId?: string;
  /** Multi-tool FairPay summary (capabilities tour). */
  readDigestActive?: boolean;
  digestBag?: ReadDigestBag;
}
