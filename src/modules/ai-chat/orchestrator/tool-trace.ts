/** A single FairPay tool invocation surfaced in chat UI (no payloads). */
export interface AssistantToolTraceStep {
  name: string;
  status?: "running" | "done" | "error";
}

export const READ_DIGEST_TOOL_SEQUENCE = [
  "get_debt_summary",
  "fairpay_list_groups",
  "get_friends",
  "get_expenses",
  "get_recent_expense_comments",
] as const;

export function isReadDigestTool(name: string): boolean {
  return (READ_DIGEST_TOOL_SEQUENCE as readonly string[]).includes(name);
}
