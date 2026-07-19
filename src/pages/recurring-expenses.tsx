import { RecurringExpenseList } from "@/modules/expenses";

/**
 * Global recurring expenses page (all contexts for the signed-in user).
 * Group/friend scoped lists remain on their show pages.
 */
export default function RecurringExpensesPage() {
  return <RecurringExpenseList />;
}
