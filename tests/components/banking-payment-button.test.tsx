import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { BankingPaymentButton } from '@/modules/payments/components/banking-payment-button';
import { ExpenseSplit } from '@/modules/expenses/types';
import { DonationSettings } from '@/types/donation';

// Mock hooks
vi.mock('@/hooks/use-donation-settings', () => ({
  useDonationSettings: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

import { useDonationSettings } from '@/hooks/use-donation-settings';

describe('BankingPaymentButton - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Feature: banking-payment-option, Property 1: Banking Button Visibility for Regular Users
   * Validates: Requirements 1.1, 5.4
   * 
   * For any unsettled expense split where the current user is not the payer 
   * and donation settings are configured, the Banking Payment Button should be visible.
   */
  it('Property 1: Button visible for unsettled splits with donation settings', () => {
    // Generator for unsettled expense splits
    const unsettledSplitArb = fc.record({
      id: fc.uuid(),
      expense_id: fc.uuid(),
      user_id: fc.uuid(),
      split_method: fc.constantFrom('equal', 'exact', 'percentage'),
      split_value: fc.option(fc.double({ min: 0, max: 1000 }), { nil: null }),
      computed_amount: fc.double({ min: 1, max: 1000 }),
      is_settled: fc.constant(false),
      settled_amount: fc.constant(0),
      created_at: fc.date().map(d => d.toISOString()),
      profiles: fc.record({
        id: fc.uuid(),
        full_name: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.emailAddress(),
      }),
    });

    // Generator for configured donation settings
    const donationSettingsArb = fc.record({
      id: fc.uuid(),
      is_enabled: fc.constant(true),
      avatar_image_url: fc.option(fc.webUrl(), { nil: null }),
      qr_code_image_url: fc.option(fc.webUrl(), { nil: null }),
      cta_text: fc.record({
        en: fc.string({ minLength: 1, maxLength: 100 }),
        vi: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      donate_message: fc.record({
        en: fc.string({ minLength: 1, maxLength: 200 }),
        vi: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      bank_info: fc.record({
        app: fc.option(fc.string(), { nil: undefined }),
        account: fc.string({ minLength: 8, maxLength: 20 }),
        bank: fc.string({ minLength: 2, maxLength: 10 }),
        amount: fc.option(fc.string(), { nil: undefined }),
        description: fc.option(fc.string(), { nil: undefined }),
        accountName: fc.option(fc.string(), { nil: undefined }),
      }),
      created_at: fc.date().map(d => d.toISOString()),
      updated_at: fc.date().map(d => d.toISOString()),
    });

    fc.assert(
      fc.property(
        unsettledSplitArb,
        donationSettingsArb,
        (split, donationSettings) => {
          // Mock the hook to return configured donation settings
          vi.mocked(useDonationSettings).mockReturnValue({
            data: donationSettings as DonationSettings,
            isLoading: false,
            error: null,
            isError: false,
            isSuccess: true,
          } as any);

          const { container } = render(
            <BankingPaymentButton split={split as any} />
          );

          // Button should be visible (not null)
          const button = container.querySelector('button');
          expect(button).toBeInTheDocument();
          expect(button).toHaveTextContent('Pay via Banking');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('BankingPaymentButton - Unit Tests', () => {
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

  const createMockDonationSettings = (): DonationSettings => ({
    id: '1',
    is_enabled: true,
    avatar_image_url: null,
    qr_code_image_url: null,
    cta_text: { en: 'Donate', vi: 'Quyên góp' },
    donate_message: { en: 'Thank you', vi: 'Cảm ơn' },
    bank_info: {
      account: '1234567890',
      bank: 'VCB',
      accountName: 'Test Account',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  it('should hide button when split is settled', () => {
    const split = createMockSplit({ is_settled: true });
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should hide button when remaining amount is zero', () => {
    const split = createMockSplit({ 
      computed_amount: 100,
      settled_amount: 100,
    });
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should hide button when donation settings are missing', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should hide button when bank_info is missing', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings();
    settings.bank_info = null;
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should hide button while loading', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should render button with correct styling', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-blue-700');
  });

  it('should render button with BanknoteIcon', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} disabled={true} />);
    
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
    } as any);

    const { container } = render(
      <BankingPaymentButton split={split} className="custom-class" />
    );
    
    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });
});

describe('BankingPaymentButton - Error Handling Tests', () => {
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

  const createMockDonationSettings = (): DonationSettings => ({
    id: '1',
    is_enabled: true,
    avatar_image_url: null,
    qr_code_image_url: null,
    cta_text: { en: 'Donate', vi: 'Quyên góp' },
    donate_message: { en: 'Thank you', vi: 'Cảm ơn' },
    bank_info: {
      account: '1234567890',
      bank: 'VCB',
      accountName: 'Test Account',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  /**
   * Error Handling Test: Missing donation settings hides button
   * Validates: Requirements 8.1
   */
  it('should hide button when donation settings are missing', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Missing bank_info hides button
   * Validates: Requirements 8.1
   */
  it('should hide button when bank_info is missing', () => {
    const split = createMockSplit();
    const settings = createMockDonationSettings();
    settings.bank_info = null;
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: settings,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Loading state hides button
   * Validates: Requirements 8.4
   */
  it('should hide button during loading state', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      isError: false,
      isSuccess: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Error state hides button
   * Validates: Requirements 8.4
   */
  it('should hide button when there is an error loading donation settings', () => {
    const split = createMockSplit();
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load settings'),
      isError: true,
      isSuccess: false,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Settled split hides button
   * Validates: Requirements 1.4
   */
  it('should hide button when split is already settled', () => {
    const split = createMockSplit({ is_settled: true });
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Zero remaining amount hides button
   * Validates: Requirements 1.4
   */
  it('should hide button when remaining amount is zero', () => {
    const split = createMockSplit({ 
      computed_amount: 100,
      settled_amount: 100,
    });
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  /**
   * Error Handling Test: Negative remaining amount hides button
   * Validates: Requirements 1.4
   */
  it('should hide button when remaining amount is negative', () => {
    const split = createMockSplit({ 
      computed_amount: 100,
      settled_amount: 150,
    });
    
    vi.mocked(useDonationSettings).mockReturnValue({
      data: createMockDonationSettings(),
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    } as any);

    const { container } = render(<BankingPaymentButton split={split} />);
    
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });
});
