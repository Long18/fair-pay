export interface ExpenseCommentRow {
  id?: string;
  content?: string | null;
  created_at?: string | null;
  expense_id?: string;
  user?: { full_name?: string | null };
  profiles?: { full_name?: string | null };
  expenses?: {
    description?: string | null;
    expense_date?: string | null;
    group_id?: string | null;
  } | null;
  replies?: Array<{ content?: string | null; user?: { full_name?: string | null } }>;
}

function authorName(row: ExpenseCommentRow): string {
  return (
    row.user?.full_name?.trim() ||
    row.profiles?.full_name?.trim() ||
    "Someone"
  );
}

function extractThreadRows(data: unknown): ExpenseCommentRow[] {
  if (Array.isArray(data)) {
    return data as ExpenseCommentRow[];
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as { comments?: unknown; data?: unknown };
    for (const candidate of [obj.comments, obj.data]) {
      if (Array.isArray(candidate)) return candidate as ExpenseCommentRow[];
    }
  }
  return [];
}

function extractFeedRows(data: unknown): ExpenseCommentRow[] {
  if (Array.isArray(data)) {
    return data as ExpenseCommentRow[];
  }
  return [];
}

function formatWhen(iso: string | null | undefined, language?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(language?.startsWith("vi") ? "vi-VN" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

/** Format get_expense_comments RPC output (thread on one expense). */
export function formatExpenseCommentsThread(data: unknown, language?: string): string {
  const vi = language?.startsWith("vi") ?? false;
  const rows = extractThreadRows(data);

  if (rows.length === 0) {
    return vi ? "Chưa có bình luận nào trên khoản chi này." : "No comments on this expense yet.";
  }

  const lines: string[] = [];
  for (const row of rows) {
    const body = row.content?.trim() || (vi ? "(trống)" : "(empty)");
    lines.push(`• **${authorName(row)}** (${formatWhen(row.created_at, language)}): ${body}`);
    const replies = row.replies ?? [];
    for (const reply of replies) {
      const rBody = reply.content?.trim() || (vi ? "(trống)" : "(empty)");
      const rName = reply.user?.full_name?.trim() || "Someone";
      lines.push(`  ↳ ${rName}: ${rBody}`);
    }
  }

  const header = vi ? "Bình luận trên khoản chi:" : "Comments on this expense:";
  return [header, ...lines].join("\n");
}

/** Format get_recent_expense_comments feed output. */
export function formatRecentExpenseComments(data: unknown, language?: string): string {
  const vi = language?.startsWith("vi") ?? false;
  const rows = extractFeedRows(data);

  if (rows.length === 0) {
    return vi
      ? "Không có bình luận chi phí gần đây."
      : "No recent expense comments found.";
  }

  const lines = rows.map((row) => {
    const expenseLabel =
      row.expenses?.description?.trim() ||
      row.expense_id?.slice(0, 8) ||
      (vi ? "Khoản chi" : "Expense");
    const when = formatWhen(row.created_at, language);
    const body = row.content?.trim() || (vi ? "(trống)" : "(empty)");
    return `• ${when} — **${expenseLabel}** — ${authorName(row)}: ${body}`;
  });

  const header = vi ? "Bình luận chi phí gần đây:" : "Recent expense comments:";
  return [header, ...lines].join("\n");
}
