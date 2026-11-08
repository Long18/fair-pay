import type { BankInfo, MomoInfo } from '@/types/user-settings';
import { generateVietQRUrl } from '@/lib/vietqr';

const DEV_PREVIEW_BANK: BankInfo = {
  app: 'vcb',
  bank: 'VCB',
  account: '19036588888026',
  accountName: 'FAIRPAY LOCAL DEMO',
};

const DEV_PREVIEW_MOMO: MomoInfo = {
  accountName: 'FAIRPAY LOCAL DEMO',
  phone: '0901234567',
};

export function isBankSettingsDevPreviewEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  return import.meta.env.VITE_BANK_SETTINGS_PREVIEW !== 'false';
}

export function shouldForceBankSettingsPreview(): boolean {
  return (
    isBankSettingsDevPreviewEnabled() &&
    import.meta.env.VITE_BANK_SETTINGS_PREVIEW === 'true'
  );
}

function buildMockMomoQrUrl(): string {
  const fromEnv = import.meta.env.VITE_BANK_PREVIEW_MOMO_QR_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return 'https://placehold.co/240x240/png?text=MoMo+QR';
}

function buildMockVietQrPreviewUrl(): string | null {
  const fromEnv = import.meta.env.VITE_BANK_PREVIEW_VIETQR_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    return generateVietQRUrl(
      {
        bankCode: DEV_PREVIEW_BANK.bank!,
        accountNo: DEV_PREVIEW_BANK.account!,
        accountName: DEV_PREVIEW_BANK.accountName!,
        template: 'compact2',
      },
      { amount: 10000, addInfo: 'FairPay local bank preview' }
    );
  } catch {
    return null;
  }
}

export function resolveDevBankInfo(bankInfo: BankInfo | null): BankInfo | null {
  if (!isBankSettingsDevPreviewEnabled()) {
    return bankInfo;
  }

  const account = import.meta.env.VITE_BANK_PREVIEW_ACCOUNT?.trim() || DEV_PREVIEW_BANK.account;
  const bank = import.meta.env.VITE_BANK_PREVIEW_BANK_CODE?.trim() || DEV_PREVIEW_BANK.bank;
  const accountName =
    import.meta.env.VITE_BANK_PREVIEW_ACCOUNT_NAME?.trim() || DEV_PREVIEW_BANK.accountName;

  const mock: BankInfo = {
    ...DEV_PREVIEW_BANK,
    account,
    bank,
    accountName,
  };

  if (!bankInfo?.account && !bankInfo?.bank) {
    return shouldForceBankSettingsPreview() ? mock : null;
  }

  if (shouldForceBankSettingsPreview()) {
    return {
      bank: bankInfo.bank || mock.bank,
      account: bankInfo.account || mock.account,
      accountName: bankInfo.accountName || mock.accountName,
      app: bankInfo.app || mock.app,
    };
  }

  return bankInfo;
}

export function resolveDevMomoInfo(momoInfo: MomoInfo | null): MomoInfo | null {
  if (!isBankSettingsDevPreviewEnabled()) {
    return momoInfo;
  }

  const phone = import.meta.env.VITE_BANK_PREVIEW_MOMO_PHONE?.trim() || DEV_PREVIEW_MOMO.phone;
  const accountName =
    import.meta.env.VITE_BANK_PREVIEW_MOMO_NAME?.trim() || DEV_PREVIEW_MOMO.accountName;

  const mock: MomoInfo = {
    accountName,
    phone,
    qrCodeImageUrl: buildMockMomoQrUrl(),
  };

  if (!momoInfo?.phone && !momoInfo?.qrCodeImageUrl) {
    return shouldForceBankSettingsPreview() ? mock : momoInfo;
  }

  if (shouldForceBankSettingsPreview()) {
    return {
      accountName: momoInfo.accountName || mock.accountName,
      phone: momoInfo.phone || mock.phone,
      qrCodeImageUrl: momoInfo.qrCodeImageUrl || mock.qrCodeImageUrl,
    };
  }

  return momoInfo;
}

/** Optional VietQR preview URL for local UI when bank fields are prefilled. */
export function getDevVietQrPreviewUrl(bankInfo: BankInfo | null): string | null {
  if (!isBankSettingsDevPreviewEnabled() || !bankInfo?.bank || !bankInfo?.account) {
    return null;
  }
  return buildMockVietQrPreviewUrl();
}
