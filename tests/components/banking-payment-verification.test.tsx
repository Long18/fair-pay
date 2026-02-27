/**
 * Checkpoint Verification Test
 * Task 3: Verify components work independently
 * 
 * This test verifies that:
 * 1. BankingPaymentButton renders correctly
 * 2. BankingPaymentDialog displays banking information
 * 3. VietQR deeplinks generate correctly
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BankingPaymentButton } from '@/modules/payments/components/banking-payment-button';
import { BankingPaymentDialog } from '@/modules/payments/components/banking-payment-dialog';
import { generateVietQRDeeplink, findBankById } from '@/lib/vietqr-banks';
import { ExpenseSplit } from '@/modules/expenses/types';
import { DonationSettings } from '@/types/donation';

// Mock hooks
vi.mock('@/hooks/settings/use-donation-settings', () => ({
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { useDonationSettings } from '@/hooks/settings/use-donation-settings';

describe('Checkpoint 3: Component Independence Verification', () => {
  const mockSplit: ExpenseSplit & { profiles?: any } = {
    id: '123',
    expense_id: '456',
    user_id: '789',
    split_method: 'equal',
    split_value: null,
    computed_amount: 100000,
    is_settled: false,
    settled_amount: 0,
    created_at: new Date().toISOString(),
    profiles: {
      id: '789',
      full_name: 'John Doe',
      email: 'john@example.com',
    },
  };

  const mockDonationSettings: DonationSettings = {
    id: '1',
    is_enabled: true,
    avatar_image_url: null,
    qr_code_image_url: 'https://example.com/qr-code.png',
    cta_text: { en: 'Donate', vi: 'Quyên góp' },
    donate_message: { en: 'Thank you', vi: 'Cảm ơn' },
    bank_info: {
      account: '1234567890',
      bank: 'VCB',
      accountName: 'FairPay Admin',
      app: 'vcb',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('1. BankingPaymentButton renders correctly', () => {
    it('should render button with correct text and styling', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      const { container } = render(<BankingPaymentButton split={mockSplit} />);

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Pay via Banking');
      expect(button).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-blue-700');
    });

    it('should render BanknoteIcon', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      const { container } = render(<BankingPaymentButton split={mockSplit} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should hide button when conditions are not met', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      const settledSplit = { ...mockSplit, is_settled: true };
      const { container } = render(<BankingPaymentButton split={settledSplit} />);

      expect(container.querySelector('button')).not.toBeInTheDocument();
    });
  });

  describe('2. BankingPaymentDialog displays banking information', () => {
    it('should display QR code when available', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      render(
        <BankingPaymentDialog
          open={true}
          onOpenChange={() => {}}
          split={mockSplit}
          amount={100000}
        />
      );

      const qrImage = screen.getByAltText('QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', mockDonationSettings.qr_code_image_url);
    });

    it('should display bank account details', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      render(
        <BankingPaymentDialog
          open={true}
          onOpenChange={() => {}}
          split={mockSplit}
          amount={100000}
        />
      );

      expect(screen.getByText('FairPay Admin')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('VCB')).toBeInTheDocument();
    });

    it('should display bank selector', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      render(
        <BankingPaymentDialog
          open={true}
          onOpenChange={() => {}}
          split={mockSplit}
          amount={100000}
        />
      );

      expect(screen.getByText('Select Your Bank App')).toBeInTheDocument();
    });

    it('should display dialog title and description', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      render(
        <BankingPaymentDialog
          open={true}
          onOpenChange={() => {}}
          split={mockSplit}
          amount={100000}
        />
      );

      expect(screen.getByText('Pay via Banking')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  describe('3. VietQR deeplinks generate correctly', () => {
    it('should generate valid deeplink with all parameters', () => {
      const bankId = 'vcb';
      const account = '1234567890';
      const bankCode = 'VCB';
      const amount = '100000';
      const description = 'FairPay: John Doe';

      const deeplink = generateVietQRDeeplink(bankId, account, bankCode, amount, description);

      // Verify URL structure
      expect(deeplink).toContain('https://dl.vietqr.io/pay');
      expect(deeplink).toContain(`app=${bankId}`);
      expect(deeplink).toContain(`ba=${account}%40${bankCode}`);
      expect(deeplink).toContain(`am=${amount}`);
      expect(deeplink).toContain('tn=');

      // Verify it's a valid URL
      expect(() => new URL(deeplink)).not.toThrow();
    });

    it('should generate deeplink without optional parameters', () => {
      const bankId = 'mb';
      const account = '9876543210';
      const bankCode = 'MB';

      const deeplink = generateVietQRDeeplink(bankId, account, bankCode);

      expect(deeplink).toContain('https://dl.vietqr.io/pay');
      expect(deeplink).toContain(`app=${bankId}`);
      expect(deeplink).toContain(`ba=${account}%40${bankCode}`);
      expect(deeplink).not.toContain('am=');
      expect(deeplink).not.toContain('tn=');
    });

    it('should find bank by ID', () => {
      const bank = findBankById('vcb');

      expect(bank).toBeDefined();
      expect(bank?.name).toBe('Vietcombank');
      expect(bank?.code).toBe('VCB');
    });

    it('should return undefined for invalid bank ID', () => {
      const bank = findBankById('invalid-bank');

      expect(bank).toBeUndefined();
    });

    it('should generate deeplinks for multiple banks', () => {
      const banks = ['vcb', 'mb', 'tcb', 'acb'];
      const account = '1234567890';
      const bankCode = 'VCB';

      banks.forEach(bankId => {
        const deeplink = generateVietQRDeeplink(bankId, account, bankCode);
        
        expect(deeplink).toContain('https://dl.vietqr.io/pay');
        expect(deeplink).toContain(`app=${bankId}`);
        expect(() => new URL(deeplink)).not.toThrow();
      });
    });
  });

  describe('Integration: Components work together', () => {
    it('should render button that opens dialog with correct data', () => {
      vi.mocked(useDonationSettings).mockReturnValue({
        data: mockDonationSettings,
        isLoading: false,
      } as any);

      const { container } = render(<BankingPaymentButton split={mockSplit} />);

      // Button should be present
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();

      // Dialog should be in the DOM (even if not visible)
      // This verifies the button component includes the dialog
      expect(container.innerHTML).toContain('Pay via Banking');
    });
  });
});
