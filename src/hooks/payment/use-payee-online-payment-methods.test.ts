import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePayeeOnlinePaymentMethods } from "./use-payee-online-payment-methods";

vi.mock("@/hooks/payment/use-bank-settings", () => ({
  usePayeeBankSettings: vi.fn(),
}));
vi.mock("@/hooks/payment/use-sepay-settings", () => ({
  usePayeeSepaySettings: vi.fn(),
}));
vi.mock("@/hooks/payment/use-momo-info-settings", () => ({
  usePayeeMomoInfo: vi.fn(),
}));

import { usePayeeBankSettings } from "@/hooks/payment/use-bank-settings";
import { usePayeeSepaySettings } from "@/hooks/payment/use-sepay-settings";
import { usePayeeMomoInfo } from "@/hooks/payment/use-momo-info-settings";

describe("usePayeeOnlinePaymentMethods", () => {
  it("returns hasOnlineMethods when VietQR is configured", () => {
    vi.mocked(usePayeeBankSettings).mockReturnValue({
      isConfigured: true,
      isLoading: false,
    } as ReturnType<typeof usePayeeBankSettings>);
    vi.mocked(usePayeeSepaySettings).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeSepaySettings>);
    vi.mocked(usePayeeMomoInfo).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeMomoInfo>);

    const { result } = renderHook(() =>
      usePayeeOnlinePaymentMethods("user-1", true),
    );

    expect(result.current.hasOnlineMethods).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns no online methods when nothing configured", () => {
    vi.mocked(usePayeeBankSettings).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeBankSettings>);
    vi.mocked(usePayeeSepaySettings).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeSepaySettings>);
    vi.mocked(usePayeeMomoInfo).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeMomoInfo>);

    const { result } = renderHook(() =>
      usePayeeOnlinePaymentMethods("user-1", true),
    );

    expect(result.current.hasOnlineMethods).toBe(false);
  });

  it("ignores SePay when allowSepay is false", () => {
    vi.mocked(usePayeeBankSettings).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeBankSettings>);
    vi.mocked(usePayeeSepaySettings).mockReturnValue({
      isConfigured: true,
      isLoading: false,
    } as ReturnType<typeof usePayeeSepaySettings>);
    vi.mocked(usePayeeMomoInfo).mockReturnValue({
      isConfigured: false,
      isLoading: false,
    } as ReturnType<typeof usePayeeMomoInfo>);

    const { result } = renderHook(() =>
      usePayeeOnlinePaymentMethods("user-1", false),
    );

    expect(result.current.hasOnlineMethods).toBe(false);
  });
});
