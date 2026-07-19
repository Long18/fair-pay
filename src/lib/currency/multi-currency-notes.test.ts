import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY,
  convertCurrencyPlaceholder,
  resolveCurrency,
  SUPPORTED_CURRENCIES,
} from "./multi-currency-notes";

describe("multi-currency-notes", () => {
  it("defaults to VND", () => {
    expect(DEFAULT_CURRENCY).toBe("VND");
    expect(resolveCurrency()).toBe("VND");
    expect(resolveCurrency(null)).toBe("VND");
    expect(resolveCurrency(undefined)).toBe("VND");
    expect(resolveCurrency("")).toBe("VND");
    expect(resolveCurrency("XYZ")).toBe("VND");
  });

  it("includes VND in the supported catalog", () => {
    expect(SUPPORTED_CURRENCIES).toContain("VND");
    expect(SUPPORTED_CURRENCIES[0]).toBe("VND");
  });

  it("resolves known codes without changing them", () => {
    expect(resolveCurrency("USD")).toBe("USD");
    expect(resolveCurrency("VND")).toBe("VND");
  });

  it("conversion placeholder does not invent FX rates", () => {
    const same = convertCurrencyPlaceholder(100_000, "VND", "VND");
    expect(same).toEqual({
      amount: 100_000,
      from: "VND",
      to: "VND",
      converted: false,
    });

    const cross = convertCurrencyPlaceholder(100_000, "VND", "USD");
    expect(cross.amount).toBe(100_000);
    expect(cross.converted).toBe(false);
    expect(cross.from).toBe("VND");
    expect(cross.to).toBe("USD");
  });
});
