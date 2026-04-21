export function toVersionToken(raw: string): string {
  const value = raw.trim();
  const parsed = Date.parse(value);

  if (!Number.isNaN(parsed)) {
    return String(Math.floor(parsed / 1000));
  }

  const sanitized = value.replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized || "0";
}
