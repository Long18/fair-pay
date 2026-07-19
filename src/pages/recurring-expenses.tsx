import { RecurringExpenseList } from "@/modules/expenses";

/**
 * Global recurring expenses route (`/recurring-expenses`).
 * List-first shell lives in RecurringExpenseList standalone mode.
 * Group/friend embeds pass groupId/friendshipId and skip that shell.
 */
export default function RecurringExpensesPage() {
  return (
    <div data-page="recurring-expenses-v2">
      <RecurringExpenseList />
    </div>
  );
}
