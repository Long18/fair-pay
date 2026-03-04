type ShareVersionSource = {
  id?: string | null
  updated_at?: string | null
  created_at?: string | null
  expense_date?: string | null
}

function extractExpenseIdFromUrl(url: URL): string | null {
  const fromQuery = url.searchParams.get("id") || url.searchParams.get("expense_id")
  if (fromQuery) return fromQuery

  const match = url.pathname.match(/\/expenses\/show\/([^/?#]+)/)
  return match?.[1] ?? null
}

function toVersionToken(raw: string): string {
  const value = raw.trim()
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return String(Math.floor(parsed / 1000))
  }

  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "")
  return sanitized || "0"
}

export function buildExpenseShareUrl(
  expense: ShareVersionSource,
  currentUrl: string,
): string {
  try {
    const current = new URL(currentUrl)
    const expenseId = expense.id || extractExpenseIdFromUrl(current)
    if (!expenseId) return currentUrl

    const url = new URL("/api/share/expense", current.origin)
    const versionSource =
      expense.updated_at ||
      expense.created_at ||
      expense.expense_date ||
      expenseId ||
      "0"

    url.searchParams.set("id", expenseId)
    url.searchParams.set("v", toVersionToken(versionSource))
    return url.toString()
  } catch {
    return currentUrl
  }
}
