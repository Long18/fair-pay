import { describe, expect, it } from 'vitest';
import { buildDevDonationSettings } from '@/lib/donation/dev-preview-settings';

describe('donation dev preview', () => {
  it('builds mock settings with VietQR URL and amount', () => {
    const settings = buildDevDonationSettings();
    expect(settings.is_enabled).toBe(true);
    expect(settings.qr_code_image_url).toContain('vietqr.io');
    expect(settings.bank_info?.amount).toBeTruthy();
  });
});
