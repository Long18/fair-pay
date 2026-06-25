/**
 * Shared utilities for friend expense components.
 */

/**
 * Convert currency code to symbol.
 * @example symbolFor("VND") → "₫"
 */
export const symbolFor = (currency: string): string => {
  switch (currency) {
    case "VND":
      return "₫";
    case "USD":
      return "$";
    case "EUR":
      return "€";
    default:
      return currency;
  }
};

/**
 * Extract initials from a name.
 * @example initialsFor("Nguyễn Tiến Tâm") → "NT"
 */
export const initialsFor = (name: string): string =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
