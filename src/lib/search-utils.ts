/**
 * Fold text for diacritic-insensitive search (Vietnamese-friendly).
 * "Bùi" / "Bui" and "Phúc" / "Phuc" / "đức" / "duc" all match.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

/** True when `haystack` contains `needle` after diacritic folding. */
export function matchesSearchText(haystack: string, needle: string): boolean {
  const foldedNeedle = normalizeSearchText(needle).trim();
  if (!foldedNeedle) return true;
  return normalizeSearchText(haystack).includes(foldedNeedle);
}

/**
 * True when any field matches `needle` after diacritic folding.
 * Empty/whitespace needle matches everything.
 */
export function matchesSearchFields(
  needle: string,
  ...fields: Array<string | null | undefined>
): boolean {
  const foldedNeedle = normalizeSearchText(needle).trim();
  if (!foldedNeedle) return true;
  return fields.some(
    (field) =>
      typeof field === "string" &&
      field.length > 0 &&
      normalizeSearchText(field).includes(foldedNeedle)
  );
}
