export interface LocalizedText {
  en: string;
  vi: string;
}

export interface BankInfo {
  app?: string;
  account?: string;
  bank?: string;
  amount?: string;
  description?: string;
  accountName?: string;
}

export interface DonationSettings {
  id: string;
  is_enabled: boolean;
  avatar_image_url: string | null;
  qr_code_image_url: string | null;
  cta_text: LocalizedText;
  donate_message: LocalizedText;
  bank_info: BankInfo | null;
  created_at: string;
  updated_at: string;
}
