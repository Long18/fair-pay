import { appendShareRef } from "@/lib/share-ref";

type ShareVersionSource = {
  id?: string | null
  updated_at?: string | null
  created_at?: string | null
  expense_date?: string | null
}

type ExpenseShareTracking = {
  source: string
  medium: string
  campaign?: string
  content: string
  term?: string | null
}

function extractExpenseIdFromUrl(url: URL): string | null {
  const fromQuery = url.searchParams.get("id") || url.searchParams.get("expense_id")
  if (fromQuery) return fromQuery

  const match = url.pathname.match(/\/expenses\/show\/([^/?#]+)/)
  return match?.[1] ?? null
}

export function buildExpenseShareUrl(
  expense: ShareVersionSource,
  currentUrl: string,
  tracking?: ExpenseShareTracking,
): string {
  try {
    const current = new URL(currentUrl)
    const expenseId = expense.id || extractExpenseIdFromUrl(current)
    if (!expenseId) return currentUrl

    const url = new URL(`/share/expenses/${encodeURIComponent(expenseId)}`, current.origin)

    if (!tracking) return url.toString()

    return appendShareRef(url.toString(), {
      source: tracking.source,
      medium: tracking.medium,
      campaign: tracking.campaign ?? "expense_share",
      content: tracking.content,
    })
  } catch {
    return currentUrl
  }
}
