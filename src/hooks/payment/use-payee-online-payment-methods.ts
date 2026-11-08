import { usePayeeBankSettings } from "@/hooks/payment/use-bank-settings";
import { usePayeeMomoInfo } from "@/hooks/payment/use-momo-info-settings";
import { usePayeeSepaySettings } from "@/hooks/payment/use-sepay-settings";

/**
 * Whether the payee has VietQR, MoMo QR, and/or SePay configured (matches PaymentMethodDropdown).
 */
export function usePayeeOnlinePaymentMethods(
  payeeId: string | undefined,
  allowSepay = true,
) {
  const { isConfigured: isVietQRConfigured, isLoading: bankLoading } =
    usePayeeBankSettings(payeeId);
  const { isConfigured: isSepayConfigured, isLoading: sepayLoading } =
    usePayeeSepaySettings(payeeId);
  const { isConfigured: isMomoConfigured, isLoading: momoLoading } =
    usePayeeMomoInfo(payeeId);

  const isLoading = bankLoading || sepayLoading || momoLoading;
  const hasOnlineMethods =
    isVietQRConfigured ||
    (allowSepay && isSepayConfigured) ||
    isMomoConfigured;

  return { isLoading, hasOnlineMethods };
}
