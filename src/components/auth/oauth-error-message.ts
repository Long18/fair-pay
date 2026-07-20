/** True when Supabase OAuth params likely indicate a merged/banned auth row. */
export function suggestsMergedAccountOAuthError(
  error: string | null,
  description: string | null,
): boolean {
  const haystack = `${error ?? ""} ${description ?? ""}`.toLowerCase();
  if (!haystack.trim()) return false;

  if (haystack.includes("banned_until")) return true;
  if (haystack.includes("user_banned")) return true;
  if (haystack.includes("merged_into")) return true;
  if (
    haystack.includes("unsupported scan") &&
    haystack.includes("time.time")
  ) {
    return true;
  }

  return false;
}
