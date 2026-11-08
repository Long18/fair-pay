import type { ReadDigestBag } from "../utils/format-read-digest";
import type { ChatEntitySurface } from "../utils/chat-entity-surface";

export type PlannerDecision =
  | { kind: "tool"; name: string; arguments: Record<string, unknown> }
  | {
      kind: "final";
      content: string;
      readDigestBag?: ReadDigestBag;
      assistantCapabilities?: boolean;
      entitySurface?: ChatEntitySurface;
    }
  | { kind: "delegate_llm" };

export interface PlannerTurnState {
  lastToolName?: string;
  lastToolData?: unknown;
  selectedGroupId?: string;
  /** Multi-tool FairPay summary (capabilities tour). */
  readDigestActive?: boolean;
  digestBag?: ReadDigestBag;
}
