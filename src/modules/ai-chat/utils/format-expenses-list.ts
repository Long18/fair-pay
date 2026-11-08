export interface ExpenseListRow {
  id?: string;
  description?: string | null;
  amount?: number | string;
  currency?: string | null;
  expense_date?: string | null;
  category?: string | null;
}

export function rowsFromData(data: unknown): ExpenseListRow[] {
  if (Array.isArray(data)) return data as ExpenseListRow[];
  if (typeof data === "object" && data !== null) {
    const obj = data as { data?: unknown; result?: unknown };
    for (const candidate of [obj.data, obj.result]) {
      if (Array.isArray(candidate)) return candidate as ExpenseListRow[];
    }
  }
  return [];
}

function amountNumber(amount: number | string | undefined): number | null {
  if (amount === undefined || amount === null) return null;
  const n = typeof amount === "number" ? amount : Number(String(amount).replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function formatAmount(row: ExpenseListRow): string {
  const n = amountNumber(row.amount);
  const cur = row.currency ?? "VND";
  if (n === null) return "—";
  if (cur === "VND") return `${Math.round(n).toLocaleString("vi-VN")} VND`;
  return `${n.toLocaleString()} ${cur}`;
}

export function formatRecentExpensesResponse(
  data: unknown,
  options?: { language?: string; topN?: number },
): string {
  const vi = options?.language?.startsWith("vi") ?? false;
  const topN = Math.min(Math.max(options?.topN ?? 10, 1), 20);
  const rows = rowsFromData(data)
    .slice()
    .sort(
      (a, b) => (amountNumber(b.amount) ?? 0) - (amountNumber(a.amount) ?? 0),
    )
    .slice(0, topN);

  if (rows.length === 0) {
    return vi ? "Chưa có khoản chi nào gần đây." : "No recent expenses found.";
  }

  const lines = rows.map((row, idx) => {
    const label = row.description?.trim() || row.id?.slice(0, 8) || (vi ? "Khoản chi" : "Expense");
    const date = row.expense_date ? ` (${row.expense_date})` : "";
    return `${idx + 1}. **${label}**${date} — ${formatAmount(row)}`;
  });

  const header = vi
    ? `Top ${rows.length} khoản chi (theo số tiền):`
    : `Top ${rows.length} expenses by amount:`;
  return [header, ...lines].join("\n");
}
