import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  resolveDevBankInfo,
  resolveDevMomoInfo,
  getDevVietQrPreviewUrl,
} from '@/lib/bank/dev-preview-bank-settings';

describe('bank settings dev preview', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BANK_SETTINGS_PREVIEW', 'true');
    vi.stubEnv('VITE_BANK_PREVIEW_BANK_CODE', 'VCB');
    vi.stubEnv('VITE_BANK_PREVIEW_ACCOUNT', '19036588880123');
    vi.stubEnv('VITE_BANK_PREVIEW_ACCOUNT_NAME', 'NGUYEN VAN FAIRPAY (LOCAL)');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefills bank info when DB row is empty', () => {
    const resolved = resolveDevBankInfo(null);
    expect(resolved?.bank).toBe('VCB');
    expect(resolved?.account).toBe('19036588880123');
    expect(resolved?.accountName).toBe('NGUYEN VAN FAIRPAY (LOCAL)');
  });

  it('prefills MoMo info when DB row is empty', () => {
    vi.stubEnv('VITE_BANK_PREVIEW_MOMO_PHONE', '0901234567');
    vi.stubEnv('VITE_BANK_PREVIEW_MOMO_NAME', 'NGUYEN VAN FAIRPAY (LOCAL)');

    const resolved = resolveDevMomoInfo(null);
    expect(resolved?.phone).toBe('0901234567');
    expect(resolved?.accountName).toBe('NGUYEN VAN FAIRPAY (LOCAL)');
    expect(resolved?.qrCodeImageUrl).toBeTruthy();
  });

  it('builds VietQR preview URL from prefilled bank info', () => {
    const bank = resolveDevBankInfo(null);
    const url = getDevVietQrPreviewUrl(bank);
    expect(url).toBeTruthy();
    expect(url).toContain('vietqr');
  });
});
