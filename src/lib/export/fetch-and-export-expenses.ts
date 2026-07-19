import { supabaseClient } from "@/utility/supabaseClient";
import {
  downloadExpensesCsv,
  type ExpenseCsvRow,
} from "@/lib/export/export-expenses-csv";

export async function fetchExpensesForExport(options: {
  userId: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ExpenseCsvRow[]> {
  let query = supabaseClient
    .from("expenses")
    .select("id, description, amount, currency, category, expense_date, group_id, friendship_id")
    .order("expense_date", { ascending: false })
    .limit(2000);

  if (options.groupId) {
    query = query.eq("group_id", options.groupId);
  } else {
    // User's expenses: paid by them or they appear in splits via RLS (select own participation)
    query = query.or(
      `paid_by_user_id.eq.${options.userId},created_by.eq.${options.userId}`,
    );
  }

  if (options.startDate) {
    query = query.gte("expense_date", options.startDate);
  }
  if (options.endDate) {
    query = query.lte("expense_date", options.endDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    description: row.description ?? "",
    amount: Number(row.amount) || 0,
    currency: row.currency ?? "VND",
    category: row.category ?? null,
    expense_date: row.expense_date,
    group_id: row.group_id,
    friendship_id: row.friendship_id,
  }));
}

export async function exportUserExpensesCsv(options: {
  userId: string;
  groupId?: string;
  startDate?: string;
  endDate?: string;
  filename?: string;
}): Promise<number> {
  const rows = await fetchExpensesForExport(options);
  downloadExpensesCsv({
    rows,
    filename: options.filename ?? (options.groupId ? "fairpay-group-expenses" : "fairpay-expenses"),
  });
  return rows.length;
}
