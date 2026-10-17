export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Base chrome above/below a tab table: navbar, tab row, toolbar, pager and gaps. */
export const TABLE_OFFSET = "15.5rem";
const TABLE_OFFSET_WITH_CHIPS = "17.75rem";

export function tableOffset(hasChips: boolean) {
  return hasChips ? TABLE_OFFSET_WITH_CHIPS : TABLE_OFFSET;
}

