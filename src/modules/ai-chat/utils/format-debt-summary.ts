export interface DebtSummaryRow {
  counterparty_id?: string | null;
  counterparty_name?: string;
  amount?: number | string;
  currency?: string;
  i_owe_them?: boolean;
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "VND") {
    return `${Math.round(amount).toLocaleString("vi-VN")} VND`;
  }
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function debtRows(data: unknown): DebtSummaryRow[] {
  if (Array.isArray(data)) return data as DebtSummaryRow[];
  if (typeof data === "object" && data !== null) {
    const wrapped = data as { data?: unknown; result?: unknown; summary?: unknown };
    for (const candidate of [wrapped.data, wrapped.result, wrapped.summary]) {
      if (Array.isArray(candidate)) return candidate as DebtSummaryRow[];
    }
  }
  return [];
}

/**
 * Format get_debt_summary tool output into user-facing text without an LLM round.
 */
export function formatDebtSummaryResponse(data: unknown, language?: string): string {
  const vi = language?.startsWith("vi") ?? false;
  const rows = debtRows(data);

  if (rows.length === 0) {
    return vi
      ? "Bạn không có khoản nợ nào đang mở — mọi thứ đã cân bằng."
      : "You have no open balances — everything is settled.";
  }

  const oweThem: string[] = [];
  const owedToMe: string[] = [];

  for (const row of rows) {
    const name = row.counterparty_name?.trim() || (vi ? "Ai đó" : "Someone");
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const currency = row.currency ?? "VND";
    const formatted = formatAmount(amount, currency);

    if (row.i_owe_them) {
      oweThem.push(vi ? `• Bạn nợ ${name}: ${formatted}` : `• You owe ${name}: ${formatted}`);
    } else {
      owedToMe.push(vi ? `• ${name} nợ bạn: ${formatted}` : `• ${name} owes you: ${formatted}`);
    }
  }

  if (oweThem.length === 0 && owedToMe.length === 0) {
    return vi
      ? "Bạn không có khoản nợ nào đang mở — mọi thứ đã cân bằng."
      : "You have no open balances — everything is settled.";
  }

  const sections: string[] = [];
  if (owedToMe.length > 0) {
    sections.push(vi ? "Người nợ bạn:" : "People who owe you:", ...owedToMe);
  }
  if (oweThem.length > 0) {
    if (sections.length > 0) sections.push("");
    sections.push(vi ? "Bạn nợ:" : "You owe:", ...oweThem);
  }

  return sections.join("\n");
}
