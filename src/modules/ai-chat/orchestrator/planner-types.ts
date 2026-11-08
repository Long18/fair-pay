export type PlannerDecision =
  | { kind: "tool"; name: string; arguments: Record<string, unknown> }
  | { kind: "final"; content: string }
  | { kind: "delegate_llm" };

export interface PlannerTurnState {
  lastToolName?: string;
  lastToolData?: unknown;
  selectedGroupId?: string;
}
