/**
 * Phase 5 multi-currency notes (MVP scaffolding).
 *
 * FairPay amounts are historically VND-first. This module documents the
 * supported currency codes and provides a conversion placeholder — real FX
 * rates and settle-in-payer-currency are TBD (see docs/features/phase5-scale.md).
 */

export const DEFAULT_CURRENCY = "VND" as const;

/** Currencies we format / accept in product UI (not a full FX universe). */
export const SUPPORTED_CURRENCIES = [
  "VND",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "KRW",
  "THB",
  "SGD",
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(
  code: string
): code is SupportedCurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/**
 * Resolve a currency code to a supported one, defaulting to VND.
 */
export function resolveCurrency(
  code?: string | null
): SupportedCurrencyCode {
  if (code && isSupportedCurrency(code)) {
    return code;
  }
  return DEFAULT_CURRENCY;
}

/**
 * Placeholder conversion. Always returns the same amount until FX is wired.
 * Callers must not treat this as a real exchange rate.
 */
export function convertCurrencyPlaceholder(
  amount: number,
  from: string,
  to: string
): { amount: number; from: SupportedCurrencyCode; to: SupportedCurrencyCode; converted: boolean } {
  const fromCode = resolveCurrency(from);
  const toCode = resolveCurrency(to);
  if (fromCode === toCode) {
    return { amount, from: fromCode, to: toCode, converted: false };
  }
  // TBD: apply FX snapshot. Identity for scaffolding.
  return { amount, from: fromCode, to: toCode, converted: false };
}
