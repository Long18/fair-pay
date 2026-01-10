import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { BankingPaymentDialog } from '@/modules/payments/components/banking-payment-dialog';
import { ExpenseSplit } from '@/modules/expenses/types';
import { DonationSettings } from '@/types/donation';
import { generateVietQRDeeplink } from '@/lib/vietqr-banks';

// Mock hooks
vi.mock('@/hooks/use-donation-settings', () => ({
  useDonationSettings: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string, options?: any) => {
      if (options) {
        let result = defaultValue;
        Object.keys(options).forEach(optKey => {
          result = result.replace(`{{${optKey}}}`, options[optKey]);
        });
        return result;
      }
      return defaultValue;
    },
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useDonationSettings } from '@/hooks/use-donation-settings';

describe('BankingPaymentDialog - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: banking-payment-option, Property 6: VietQR Deeplink Generation
   * Validates: Requirements 2.5
   * 
   * For any valid combination of bank ID, account number, and bank code, 
   * the system should generate a valid VietQR deeplink URL.
   */
  it('Property 6: VietQR deeplink generation with valid parameters', () => {
    // Generator for bank IDs (common Vietnamese banks)
    const bankIdArb = fc.constantFrom(
      'vcb', 'mb', 'tcb', 'acb', 'vib', 'vpb', 'scb', 'agb', 'bidv', 'vietinbank'
    );

    // Generator for account numbers (8-20 digits)
    const accountArb = fc.array(fc.integer({ min: 0, max: 9 }), { 
      minLength: 8, 
      maxLength: 20 
    }).map(arr => arr.join(''));

    // Generator for bank codes (2-10 uppercase letters)
    const bankCodeArb = fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'V', 'M', 'T'), {
      minLength: 2,
      maxLength: 10,
    }).map(arr => arr.join(''));

    fc.assert(
      fc.property(
        bankIdArb,
        accountArb,
        bankCodeArb,
        (bankId, account, bankCode) => {
          // Generate deeplink
          const deeplink = generateVietQRDeeplink(bankId, account, bankCode);

          // Verify deeplink URL structure is valid
          expect(deeplink).toContain('https://dl.vietqr.io/pay');
          expect(deeplink).toContain(`app=${bankId}`);
          // Account for URL encoding: @ becomes %40
          const encodedBankAccount = `${account}%40${bankCode}`;
          expect(deeplink).toContain(`ba=${encodedBankAccount}`);

          // Verify it's a valid URL
          expect(() => new URL(deeplink)).not.toThrow();
          
          // Verify URL parameters are correctly parsed
          const url = new URL(deeplink);
          expect(url.searchParams.get('app')).toBe(bankId);
          expect(url.searchParams.get('ba')).toBe(`${account}@${bankCode}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: banking-payment-option, Property 7: Payment Amount Inclusion
   * Validates: Requirements 2.5
   * 
   * For any banking payment dialog, the generated VietQR deeplink 
   * should include the remaining amount to be paid.
   */
  it('Property 7: Payment amount appears correctly in deeplink', () => {
    // Generator for payment amounts (positive numbers)
    const amountArb = fc.double({ min: 1, max: 100000000, noNaN: true });

    const bankIdArb = fc.constantFrom('vcb', 'mb', 'tcb');
    const accountArb = fc.array(fc.integer({ min: 0, max: 9 }), { 
      minLength: 10, 
      maxLength: 15 
    }).map(arr => arr.join(''));
    const bankCodeArb = fc.constantFrom('VCB', 'MB', 'TCB');

    fc.assert(
      fc.property(
        amountArb,
        bankIdArb,
        accountArb,
        bankCodeArb,
        (amount, bankId, account, bankCode) => {
          // Generate deeplink with amount
          const deeplink = generateVietQRDeeplink(
            bankId, 
            account, 
            bankCode, 
            amount.toString()
          );

          // Verify amount appears correctly in deeplink
          expect(deeplink).toContain(`am=${amount}`);

          // Verify the URL is still valid
          const url = new URL(deeplink);
          expect(url.searchParams.get('am')).toBe(amount.toString());
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BankingPaymentDialog - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockSplit = (overrides?: Partial<ExpenseSplit>): ExpenseSplit & { profiles?: any } => ({
    id: '123',
    expense_id: '456',
    user_id: '789',
    split_method: 'equal',
    split_value: null,
    computed_amount: 100,
    is_settled: false,
    settled_amount: 0,
    created_at: new Date().toISOString(),
    profiles: {
      id: '789',
      full_name: 'Test User',
      email: 'test@example.com',
    },
    ...overrides,
  });

  const createMockDonationSettings = (overrides?: Partial<DonationSettings>): DonationSettings => ({
    id: '1',
    is_enabled: true,
    avatar_image_url: null,
    qr_code_image_url: 'https://example.com/qr.png',
    cta_text: { en: 'Donate', vi: 'Quyên góp' },
    donate_message: { en: 'Thank you', vi: 'Cảm ơn' },
    bank_info: {
      account: '1234567890',
      bank: 'VCB',
      accountName: 'Test Account',
      app: 'vcb',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  /**
   * Unit Test: QR code displays when available
   * Validates: Requirements 2.1
   */
  it('should display QR code when qr_code_image_url is available', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings();

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    const qrImage = screen.getByAltText('QR Code');
    expect(qrImage).toBeInTheDocument();
    expect(qrImage).toHaveAttribute('src', settings.qr_code_image_url);
  });

  /**
   * Unit Test: Bank account details display
   * Validates: Requirements 2.2
   */
  it('should display bank account details', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings();

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    expect(screen.getByText('Test Account')).toBeInTheDocument();
    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('VCB')).toBeInTheDocument();
  });

  /**
   * Unit Test: Bank selector displays
   * Validates: Requirements 2.3
   */
  it('should display bank selector', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings();

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    expect(screen.getByText('Select Your Bank App')).toBeInTheDocument();
  });

  /**
   * Unit Test: Missing QR code handled gracefully
   * Validates: Requirements 2.1
   */
  it('should handle missing QR code gracefully', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings({ qr_code_image_url: null });

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    // QR code section should not be present
    expect(screen.queryByAltText('QR Code')).not.toBeInTheDocument();
    
    // But bank details should still be displayed
    expect(screen.getByText('Test Account')).toBeInTheDocument();
  });

  /**
   * Unit Test: Dialog title and description
   */
  it('should display correct dialog title and description', () => {
    const split = createMockSplit({ 
      profiles: { 
        id: '789', 
        full_name: 'John Doe',
        email: 'john@example.com' 
      } 
    });
    const settings = createMockDonationSettings();

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={50000}
      />
    );

    expect(screen.getByText('Pay via Banking')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  /**
   * Unit Test: Missing bank info handled gracefully
   */
  it('should handle missing bank info gracefully', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings({ bank_info: null });

    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    // Bank details section should not be present
    expect(screen.queryByText('Account Name:')).not.toBeInTheDocument();
    
    // Bank selector should not be present
    expect(screen.queryByText('Select Your Bank App')).not.toBeInTheDocument();
  });

  /**
   * Unit Test: Loading state
   */
  it('should return null when loading', () => {
    const split = createMockSplit();

    vi.mocked(useDonationSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(
      <BankingPaymentDialog
        open={true}
        onOpenChange={() => {}}
        split={split}
        amount={100}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
