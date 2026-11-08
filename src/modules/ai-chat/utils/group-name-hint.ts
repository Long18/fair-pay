import { parseGroupNameHint } from "./transaction-scope";

const GROUP_DETAILS_VI_RE =
  /(?:chi\s*tiết|thông\s*tin)\s+nhóm\s+([A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9\s_-]{0,60})/iu;

const GROUP_DETAILS_EN_RE =
  /\b(?:details?|info(?:rmation)?)\s+(?:for\s+)?(?:the\s+)?(.+?)\s+group\b/i;

const GROUP_MEMBERS_EXPENSES_RE =
  /\bgroup\s+([A-Za-z0-9][A-Za-z0-9\s_-]{0,60})\s+(?:members?|expenses?)/i;

function cleanHint(raw: string): string | null {
  const name = raw
    .replace(/\s+[\d.,]+(?:\s*(?:k|nghìn|ngàn|triệu|tr|vnd|đ|d))?$/iu, "")
    .replace(/\s+(?:thành\s*viên|members?|expenses?|chi\s*tiêu).*$/iu, "")
    .trim();
  if (name.length < 2) return null;
  return name.slice(0, 120);
}

/** Extract a specific group name from read/detail or expense context phrases. */
export function extractGroupNameHint(text: string): string | null {
  const trimmed = text.trim();
  for (const re of [GROUP_DETAILS_VI_RE, GROUP_DETAILS_EN_RE, GROUP_MEMBERS_EXPENSES_RE]) {
    const m = re.exec(trimmed);
    if (m?.[1]) {
      const hint = cleanHint(m[1].trim());
      if (hint) return hint;
    }
  }
  return parseGroupNameHint(trimmed);
}
