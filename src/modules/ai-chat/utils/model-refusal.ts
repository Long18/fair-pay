/** Detect generic LLM refusals that skip tools (common on small on-device models). */
export function looksLikeHollowRefusal(content: string): boolean {
  const s = content.trim();
  if (!s || s.length > 500) return false;
  return /(?:không có thông tin|tôi không có.*thông tin|tôi không hiểu|bạn có thể thử xem|cần thông tin từ bạn|i don'?t have (?:information|access|data)|i cannot (?:access|retrieve)|unable to (?:access|retrieve))/i.test(
    s,
  );
}
