type ShareVersionSource = {
  id?: string | null
  updated_at?: string | null
  created_at?: string | null
  expense_date?: string | null
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
    const url = new URL(currentUrl)
    const versionSource =
      expense.updated_at ||
      expense.created_at ||
      expense.expense_date ||
      expense.id ||
      "0"

    url.searchParams.set("v", toVersionToken(versionSource))
    return url.toString()
  } catch {
    return currentUrl
  }
}
