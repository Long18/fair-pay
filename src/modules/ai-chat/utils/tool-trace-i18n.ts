/** i18n keys under aiChat.toolTrace.tools.* */
const TOOL_LABEL_KEYS: Record<string, string> = {
  get_debt_summary: "aiChat.toolTrace.tools.debt",
  fairpay_list_groups: "aiChat.toolTrace.tools.groups",
  get_friends: "aiChat.toolTrace.tools.friends",
  get_expenses: "aiChat.toolTrace.tools.expenses",
  get_recent_expense_comments: "aiChat.toolTrace.tools.comments",
  get_debt_details: "aiChat.toolTrace.tools.debtDetails",
  fairpay_get_group_details: "aiChat.toolTrace.tools.groupDetails",
  get_expense_comments: "aiChat.toolTrace.tools.expenseComments",
  fairpay_preview_expense: "aiChat.toolTrace.tools.preview",
};

export function toolTraceLabelKey(toolName: string): string {
  return TOOL_LABEL_KEYS[toolName] ?? "aiChat.toolTrace.tools.generic";
}
