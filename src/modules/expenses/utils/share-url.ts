import { toVersionToken } from "@/lib/share-url";
import { buildTrackedUrl } from "@/lib/utm";

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

    const url = new URL("/api/share/expense", current.origin)
    const versionSource =
      expense.updated_at ||
      expense.created_at ||
      expense.expense_date ||
      expenseId ||
      "0"

    url.searchParams.set("id", expenseId)
    url.searchParams.set("v", toVersionToken(versionSource))

    if (!tracking) return url.toString()

    return buildTrackedUrl({
      baseUrl: url.toString(),
      source: tracking.source,
      medium: tracking.medium,
      campaign: tracking.campaign ?? "expense_share",
      content: tracking.content,
      term: tracking.term,
    })
  } catch {
    return currentUrl
  }
}
