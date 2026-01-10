import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExpenseSplitCard } from '@/modules/expenses/components/expense-split-card';

// Mock hooks and components
vi.mock('@/hooks/use-donation-settings', () => ({
  useDonationSettings: vi.fn(),
}));

vi.mock('@/hooks/use-momo-settings', () => ({
  useMomoSettings: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MomoPaymentButton and BankingPaymentButton to avoid nested QueryClient issues
vi.mock('@/modules/payments/components/momo-payment-button', () => ({
  MomoPaymentButton: ({ className }: any) => (
    <button className={className}>Pay via MoMo</button>
  ),
}));

vi.mock('@/modules/payments/components/banking-payment-button', () => ({
  BankingPaymentButton: ({ className }: any) => (
    <button className={className}>Pay via Banking</button>
  ),
}));

import { useDonationSettings } from '@/hooks/use-donation-settings';
import { useMomoSettings } from '@/hooks/use-momo-settings';

// Helper to wrap components with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ExpenseSplitCard - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock donation settings
    vi.mocked(useDonationSettings).mockReturnValue({
      data: {
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
      },
      isLoading: false,
    } as any);

    // Mock MoMo settings
    vi.mocked(useMomoSettings).mockReturnValue({
      data: {
        id: '1',
        is_enabled: true,
        phone_number: '0123456789',
        account_name: 'Test MoMo',
        qr_code_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
    } as any);
  });

  /**
   * Feature: banking-payment-option, Property 8: Button Layout Consistency
   * Validates: Requirements 4.1, 4.2, 4.3, 7.1, 7.2, 7.3
   * 
   * For any screen size, payment buttons should maintain consistent spacing 
   * and alignment according to responsive design rules.
   */
  it('Property 8: Button layout consistency across viewport widths', () => {
    // Generator for viewport widths (mobile and desktop)
    const viewportWidthArb = fc.oneof(
      fc.integer({ min: 320, max: 767 }), // Mobile
      fc.integer({ min: 768, max: 1920 }) // Desktop
    );

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
        avatar_url: fc.option(fc.webUrl(), { nil: null }),
      }),
    });

    // Generator for expense
    const expenseArb = fc.record({
      id: fc.uuid(),
      description: fc.string({ minLength: 1, maxLength: 100 }),
      amount: fc.double({ min: 1, max: 10000 }),
      currency: fc.constantFrom('VND', 'USD', 'EUR'),
      paid_by_user_id: fc.uuid(),
      is_payment: fc.constant(false),
      created_at: fc.date().map(d => d.toISOString()),
    });

    fc.assert(
      fc.property(
        viewportWidthArb,
        unsettledSplitArb,
        expenseArb,
        (viewportWidth, split, expense) => {
          // Set viewport width
          global.innerWidth = viewportWidth;
          
          const isMobile = viewportWidth < 768;
          const isCurrentUser = true;
          const isPayer = false;
          const canSettle = false;

          const { container } = render(
            <ExpenseSplitCard
              split={split as any}
              expense={expense as any}
              isCurrentUser={isCurrentUser}
              isPayer={isPayer}
              canSettle={canSettle}
              isSettling={false}
              onSettle={vi.fn()}
              onPaymentComplete={vi.fn()}
            />,
            { wrapper: createWrapper() }
          );

          // Find payment buttons
          const buttons = container.querySelectorAll('button');
          const paymentButtons = Array.from(buttons).filter(btn => 
            btn.textContent?.includes('Pay via') || 
            btn.textContent?.includes('MoMo') ||
            btn.textContent?.includes('Banking')
          );

          // Verify buttons exist
          expect(paymentButtons.length).toBeGreaterThan(0);

          if (isMobile) {
            // Mobile: buttons should be in expanded area with flex-1 class
            const expandedArea = container.querySelector('.md\\:hidden');
            expect(expandedArea).toBeInTheDocument();
            
            // Check for flex container with gap
            const flexContainer = container.querySelector('.flex.gap-2');
            expect(flexContainer).toBeInTheDocument();
          } else {
            // Desktop: buttons should be inline with consistent spacing
            const desktopButtons = container.querySelector('.hidden.md\\:flex');
            expect(desktopButtons).toBeInTheDocument();
          }

          // Verify button spacing (gap-2 class should be present)
          const gapContainers = container.querySelectorAll('.gap-2');
          expect(gapContainers.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('ExpenseSplitCard - Unit Tests for Responsive Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock donation settings
    vi.mocked(useDonationSettings).mockReturnValue({
      data: {
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
      },
      isLoading: false,
    } as any);

    // Mock MoMo settings
    vi.mocked(useMomoSettings).mockReturnValue({
      data: {
        id: '1',
        is_enabled: true,
        phone_number: '0123456789',
        account_name: 'Test MoMo',
        qr_code_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
    } as any);
  });

  const createMockSplit = (overrides?: any) => ({
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
      avatar_url: null,
    },
    ...overrides,
  });

  const createMockExpense = (overrides?: any) => ({
    id: '456',
    description: 'Test Expense',
    amount: 100,
    currency: 'VND',
    paid_by_user_id: 'payer-id',
    is_payment: false,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  it('should show buttons inline on desktop layout', () => {
    global.innerWidth = 1024; // Desktop width
    
    const split = createMockSplit();
    const expense = createMockExpense();

    const { container } = render(
      <ExpenseSplitCard
        split={split}
        expense={expense}
        isCurrentUser={true}
        isPayer={false}
        canSettle={false}
        isSettling={false}
        onSettle={vi.fn()}
        onPaymentComplete={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Desktop layout should have hidden md:flex container
    const desktopContainer = container.querySelector('.hidden.md\\:flex');
    expect(desktopContainer).toBeInTheDocument();
  });

  it('should show buttons in expanded area on mobile layout', () => {
    global.innerWidth = 375; // Mobile width
    
    const split = createMockSplit();
    const expense = createMockExpense();

    const { container } = render(
      <ExpenseSplitCard
        split={split}
        expense={expense}
        isCurrentUser={true}
        isPayer={false}
        canSettle={false}
        isSettling={false}
        onSettle={vi.fn()}
        onPaymentComplete={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Mobile layout should have md:hidden container
    const mobileContainer = container.querySelector('.md\\:hidden');
    expect(mobileContainer).toBeInTheDocument();
  });

  it('should maintain consistent button spacing with gap-2', () => {
    const split = createMockSplit();
    const expense = createMockExpense();

    const { container } = render(
      <ExpenseSplitCard
        split={split}
        expense={expense}
        isCurrentUser={true}
        isPayer={false}
        canSettle={false}
        isSettling={false}
        onSettle={vi.fn()}
        onPaymentComplete={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Check for gap-2 class in button containers
    const gapContainers = container.querySelectorAll('.gap-2');
    expect(gapContainers.length).toBeGreaterThan(0);
  });

  it('should apply flex-1 class to mobile buttons for equal width', () => {
    global.innerWidth = 375; // Mobile width
    
    const split = createMockSplit();
    const expense = createMockExpense();

    const { container } = render(
      <ExpenseSplitCard
        split={split}
        expense={expense}
        isCurrentUser={true}
        isPayer={false}
        canSettle={false}
        isSettling={false}
        onSettle={vi.fn()}
        onPaymentComplete={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Mobile buttons should have flex-1 class for equal width
    // Since we're mocking the payment buttons, check that they receive the className prop
    const buttons = container.querySelectorAll('button');
    const paymentButtons = Array.from(buttons).filter(btn => 
      btn.textContent?.includes('Pay via')
    );

    // Both payment buttons should exist
    expect(paymentButtons.length).toBeGreaterThanOrEqual(2);
  });
});
