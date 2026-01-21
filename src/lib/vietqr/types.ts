/**
 * VietQR Types
 *
 * TypeScript interfaces for VietQR integration.
 * Used for generating payment QR codes following VietQR standard.
 */

export interface VietQRBank {
  code: string;        // Bank code (e.g., 'VCB', 'TCB')
  bin: string;         // Bank BIN number for VietQR
  name: string;        // Full bank name
  shortName: string;   // Short name for display
  logo?: string;       // Bank logo URL (optional)
}

export interface VietQRConfig {
  bankCode: string;    // Bank code
  accountNo: string;   // Account number
  accountName: string; // Account holder name
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';  // QR template
}

export interface VietQRParams {
  amount?: number;     // Payment amount (optional)
  addInfo?: string;    // Transfer description/note (optional)
}

export interface BankSettings {
  bankCode: string;
  accountNo: string;
  accountName: string;
  enabled: boolean;
}
