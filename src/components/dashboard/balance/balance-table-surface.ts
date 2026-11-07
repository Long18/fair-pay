/** Flat card chrome for dashboard balance lists (DESIGN.md: border-border/60, shadow-none). */
export const BALANCE_TABLE_GLASS_PANEL = [
  "overflow-hidden rounded-xl border border-border/60 bg-card shadow-none",
].join(" ");

/** Balances / activity cards with a top-docked metrics notch (MacBook display rim). */
export const BALANCE_TABLE_GLASS_PANEL_WITH_NOTCH = [
  "relative overflow-visible rounded-xl border border-border/60 bg-card shadow-none",
].join(" ");

/** Clips scrollable list body when the panel allows a top-docked metrics notch. */
export const BALANCE_TABLE_GLASS_PANEL_BODY = "overflow-hidden rounded-xl";

export const BALANCE_TABLE_GLASS_SEPARATOR = "border-border/60";

/** Mobile list row dividers inside the balance card. */
export const BALANCE_TABLE_GLASS_DIVIDE = "divide-y divide-border/60";

/** Hairline between data rows (desktop). */
export const BALANCE_TABLE_ROW_BORDER = "border-b border-border/60";

/** Subtle zebra on even rows. */
export const BALANCE_TABLE_ROW_ZEBRA_EVEN = "bg-muted/30";

/** Active / expanded parent row. */
export const BALANCE_TABLE_ROW_EXPANDED = "bg-muted/50";

export const BALANCE_TABLE_ROW_HOVER = "transition-colors hover:bg-muted/40";

/** Shared interactive row chrome (table + list). */
export const BALANCE_TABLE_ROW_BASE = [
  BALANCE_TABLE_ROW_BORDER,
  BALANCE_TABLE_ROW_HOVER,
  "data-[state=selected]:bg-muted/50",
].join(" ");

/** Expanded row detail strip. */
export const BALANCE_EXPAND_GLASS_SURFACE = [
  "relative border-t",
  BALANCE_TABLE_GLASS_SEPARATOR,
  "bg-muted/25",
].join(" ");

/** Inset expense preview card inside the expand strip. */
export const BALANCE_EXPAND_INSET_CARD =
  "rounded-lg border border-border/60 bg-card";
