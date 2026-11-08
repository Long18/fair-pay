import type { DonationSettings } from '@/types/donation';
import { generateVietQRUrl } from '@/lib/vietqr';

const DEV_PREVIEW_BANK = {
  app: 'vcb',
  account: '19036588888026',
  bank: 'VCB',
  accountName: 'FAIRPAY DEMO',
  amount: '50000',
  description: 'FairPay local donation preview',
} as const;

export function isDonationDevPreviewEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  return import.meta.env.VITE_DONATION_WIDGET_PREVIEW !== 'false';
}

export function shouldForceDonationWidgetVisible(): boolean {
  return (
    isDonationDevPreviewEnabled() &&
    import.meta.env.VITE_DONATION_WIDGET_PREVIEW === 'true'
  );
}

function parsePreviewAmount(): string {
  const fromEnv = import.meta.env.VITE_DONATION_PREVIEW_AMOUNT?.trim();
  if (fromEnv && /^\d+$/.test(fromEnv)) {
    return fromEnv;
  }
  return DEV_PREVIEW_BANK.amount;
}

function buildMockQrUrl(account: string, bankCode: string, amount: string): string {
  const fromEnv = import.meta.env.VITE_DONATION_PREVIEW_QR_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  try {
    return generateVietQRUrl(
      {
        bankCode,
        accountNo: account,
        accountName: DEV_PREVIEW_BANK.accountName,
        template: 'compact2',
      },
      {
        amount: Number(amount),
        addInfo: DEV_PREVIEW_BANK.description,
      }
    );
  } catch {
    return 'https://placehold.co/292x292/png?text=VietQR+Preview';
  }
}

export function buildDevDonationSettings(): DonationSettings {
  const amount = parsePreviewAmount();
  const now = new Date().toISOString();

  return {
    id: 'local-dev-donation-preview',
    is_enabled: true,
    avatar_image_url: null,
    qr_code_image_url: buildMockQrUrl(DEV_PREVIEW_BANK.account, DEV_PREVIEW_BANK.bank, amount),
    cta_text: {
      en: 'Support FairPay',
      vi: 'Ủng hộ FairPay',
    },
    donate_message: {
      en: 'Local preview — scan the QR or open your bank app to test the donation flow.',
      vi: 'Xem thử trên máy local — quét QR hoặc mở app ngân hàng để thử luồng ủng hộ.',
    },
    bank_info: {
      app: DEV_PREVIEW_BANK.app,
      account: DEV_PREVIEW_BANK.account,
      bank: DEV_PREVIEW_BANK.bank,
      accountName: DEV_PREVIEW_BANK.accountName,
      amount,
      description: DEV_PREVIEW_BANK.description,
    },
    created_at: now,
    updated_at: now,
  };
}

export function resolveDonationSettings(
  settings: DonationSettings | null
): DonationSettings | null {
  if (!isDonationDevPreviewEnabled()) {
    return settings;
  }

  const mock = buildDevDonationSettings();

  if (!settings) {
    return mock;
  }

  if (import.meta.env.VITE_DONATION_WIDGET_PREVIEW === 'true') {
    const amount = settings.bank_info?.amount || mock.bank_info?.amount;
    return {
      ...settings,
      is_enabled: true,
      avatar_image_url: settings.avatar_image_url ?? mock.avatar_image_url,
      qr_code_image_url: settings.qr_code_image_url ?? mock.qr_code_image_url,
      bank_info: settings.bank_info?.account
        ? { ...settings.bank_info, amount: settings.bank_info.amount ?? amount }
        : mock.bank_info,
    };
  }

  return settings;
}
