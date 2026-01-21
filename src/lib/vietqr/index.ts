/**
 * VietQR API
 *
 * Generates VietQR standard QR codes for Vietnamese bank transfers.
 * Uses the public VietQR image API: https://img.vietqr.io
 *
 * @see https://vietqr.xyz/danh-sach-api/
 */

import { VietQRConfig, VietQRParams } from './types';
import { getBankByCode } from './banks';

export * from './types';
export * from './banks';

const VIETQR_BASE_URL = 'https://img.vietqr.io/image';

/**
 * Generate VietQR image URL
 *
 * @example
 * // Basic QR with amount
 * generateVietQRUrl({
 *   bankCode: 'VCB',
 *   accountNo: '1234567890',
 *   accountName: 'NGUYEN VAN A',
 * }, {
 *   amount: 100000,
 *   addInfo: 'Payment for expense FP-123'
 * });
 *
 * @param config - Bank configuration
 * @param params - Payment parameters
 * @returns VietQR image URL
 */
export function generateVietQRUrl(config: VietQRConfig, params?: VietQRParams): string {
  const bank = getBankByCode(config.bankCode);
  if (!bank) {
    throw new Error(`Unknown bank code: ${config.bankCode}`);
  }

  const template = config.template || 'compact2';

  // Build base URL: {BANK_BIN}-{ACCOUNT_NO}-{TEMPLATE}.png
  let url = `${VIETQR_BASE_URL}/${bank.bin}-${config.accountNo}-${template}.png`;

  // Add query parameters
  const queryParams = new URLSearchParams();

  if (params?.amount && params.amount > 0) {
    queryParams.set('amount', params.amount.toString());
  }

  if (params?.addInfo) {
    // VietQR addInfo should be URL-encoded
    queryParams.set('addInfo', params.addInfo);
  }

  // Add account name for display
  if (config.accountName) {
    queryParams.set('accountName', config.accountName);
  }

  const queryString = queryParams.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

/**
 * Generate payment reference code
 * Format: FP-{timestamp}-{random}
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FP-${timestamp}-${random}`;
}

/**
 * Format transfer description with reference
 */
export function formatTransferDescription(reference: string, description?: string): string {
  const desc = description ? ` ${description}` : '';
  return `${reference}${desc}`;
}

/**
 * Check if VietQR is configured for a user
 */
export function isVietQRConfigured(bankInfo: { bankCode?: string; accountNo?: string; accountName?: string } | null): boolean {
  return Boolean(bankInfo?.bankCode && bankInfo?.accountNo && bankInfo?.accountName);
}

/**
 * Create VietQR config from bank info
 */
export function createVietQRConfig(bankInfo: {
  bankCode?: string;
  accountNo?: string;
  accountName?: string;
} | null): VietQRConfig | null {
  if (!bankInfo?.bankCode || !bankInfo?.accountNo || !bankInfo?.accountName) {
    return null;
  }

  return {
    bankCode: bankInfo.bankCode,
    accountNo: bankInfo.accountNo,
    accountName: bankInfo.accountName,
    template: 'compact2',
  };
}
