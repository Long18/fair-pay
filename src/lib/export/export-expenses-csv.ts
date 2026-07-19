export interface ExpenseCsvRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  expense_date: string;
  group_id?: string | null;
  friendship_id?: string | null;
}

export interface BuildExpensesCsvOptions {
  rows: ExpenseCsvRow[];
  /** Optional filename prefix (without extension). */
  filename?: string;
}

function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Pure builder: returns CSV text (UTF-8 BOM recommended by caller on download). */
export function buildExpensesCsv(rows: ExpenseCsvRow[]): string {
  const headers = [
    "id",
    "description",
    "amount",
    "currency",
    "category",
    "expense_date",
    "group_id",
    "friendship_id",
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.id),
        escapeCsvField(row.description ?? ""),
        escapeCsvField(String(row.amount ?? 0)),
        escapeCsvField(row.currency ?? "VND"),
        escapeCsvField(row.category ?? ""),
        escapeCsvField(row.expense_date ?? ""),
        escapeCsvField(row.group_id ?? ""),
        escapeCsvField(row.friendship_id ?? ""),
      ].join(","),
    );
  }

  return lines.join("\n");
}

/** Trigger a browser download of expenses CSV. */
export function downloadExpensesCsv(options: BuildExpensesCsvOptions): void {
  const { rows, filename = "fairpay-expenses" } = options;
  const csv = buildExpensesCsv(rows);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${filename}_${stamp}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
