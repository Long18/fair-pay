const VI_DIACRITICS =
  /[ăâđêôơưĂÂĐÊÔƠƯáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/;

const VI_HINT =
  /\b(?:tôi|toi|bạn|ban|nhóm|nhom|nợ|no\b|chi tiêu|chi tieu|bao nhiêu|bao nhieu|không|khong|các|cac|gần đây|gan day|bình luận|binh luan|hóa đơn|hoa don|thêm|them|mua|đang|dang)\b/i;

/** BCP-47-ish code used by orchestrator formatters and system prompt. */
export type ResponseLanguageCode = "vi" | "en";

/**
 * Infer reply language from the user's message text (not app UI locale).
 */
export function detectUserMessageLanguage(text: string): ResponseLanguageCode {
  const sample = text.trim().slice(0, 4_000);
  if (!sample) return "en";
  if (VI_DIACRITICS.test(sample)) return "vi";
  if (VI_HINT.test(sample)) return "vi";
  return "en";
}

export function resolveResponseLanguage(
  userText: string,
  uiLanguageFallback?: string,
): ResponseLanguageCode {
  if (userText.trim()) {
    return detectUserMessageLanguage(userText);
  }
  const ui = (uiLanguageFallback ?? "").toLowerCase();
  if (ui.startsWith("vi")) return "vi";
  return "en";
}
