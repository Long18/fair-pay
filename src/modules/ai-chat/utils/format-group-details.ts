export interface GroupDetailsMember {
  user_id?: string;
  role?: string | null;
  profiles?: { full_name?: string | null } | null;
}

export interface GroupDetailsExpense {
  id?: string;
  description?: string | null;
  amount?: number | string;
  currency?: string | null;
  expense_date?: string | null;
}

function unwrapPayload(data: unknown): {
  group?: { name?: string | null; description?: string | null };
  members?: unknown;
  recent_expenses?: unknown;
} {
  if (typeof data !== "object" || data === null) return {};
  const top = data as Record<string, unknown>;
  const nested =
    typeof top.result === "object" && top.result !== null
      ? (top.result as Record<string, unknown>)
      : top;
  return {
    group: (nested.group as { name?: string | null }) ?? undefined,
    members: nested.members,
    recent_expenses: nested.recent_expenses,
  };
}

function memberRows(members: unknown): GroupDetailsMember[] {
  if (!Array.isArray(members)) return [];
  return members.filter((m): m is GroupDetailsMember => typeof m === "object" && m !== null);
}

function expenseRows(expenses: unknown): GroupDetailsExpense[] {
  if (!Array.isArray(expenses)) return [];
  return expenses.filter((e): e is GroupDetailsExpense => typeof e === "object" && e !== null);
}

function amountLabel(row: GroupDetailsExpense): string {
  const raw = row.amount;
  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw ?? "").replace(/[.,\s]/g, ""));
  const cur = row.currency ?? "VND";
  if (!Number.isFinite(n)) return "—";
  if (cur === "VND") return `${Math.round(n).toLocaleString("vi-VN")} VND`;
  return `${n.toLocaleString()} ${cur}`;
}

function memberDisplayName(row: GroupDetailsMember): string {
  const name = row.profiles?.full_name?.trim();
  if (name) return name;
  return row.user_id?.slice(0, 8) ?? "—";
}

export function formatGroupDetailsResponse(data: unknown, language?: string): string {
  const vi = language?.startsWith("vi") ?? false;
  const { group, members, recent_expenses } = unwrapPayload(data);
  const title = group?.name?.trim() || (vi ? "Nhóm" : "Group");
  const memberList = memberRows(members);
  const expenseList = expenseRows(recent_expenses).slice(0, 5);

  const lines: string[] = [];
  lines.push(vi ? `**${title}**` : `**${title}**`);
  lines.push(
    vi
      ? `Thành viên (${memberList.length}): ${memberList.map(memberDisplayName).join(", ") || "—"}`
      : `Members (${memberList.length}): ${memberList.map(memberDisplayName).join(", ") || "—"}`,
  );

  if (expenseList.length === 0) {
    lines.push(vi ? "Chưa có khoản chi gần đây trong nhóm." : "No recent group expenses.");
  } else {
    const header = vi ? "Khoản chi gần đây:" : "Recent expenses:";
    lines.push(header);
    for (const row of expenseList) {
      const label = row.description?.trim() || row.id?.slice(0, 8) || (vi ? "Khoản chi" : "Expense");
      const date = row.expense_date ? ` (${row.expense_date})` : "";
      lines.push(`• ${label}${date} — ${amountLabel(row)}`);
    }
  }

  return lines.join("\n");
}
