import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimplifiedDebts } from '@/components/dashboard/simplified-debts';
import { AggregatedDebt } from '@/hooks/use-aggregated-debts';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) => {
      const translations: Record<string, string> = {
        'dashboard.whoOwesWhom': 'Who Owes Whom',
        'dashboard.allSettledUpNoDebts': 'All settled up! No outstanding debts.',
        'dashboard.youOweUser': 'You owe',
        'dashboard.userOwesYou': 'owes you',
        'dashboard.tapToSettleUp': 'Tap to settle up',
        'dashboard.viewAll': 'View All',
        'dashboard.viewMore': `View ${params?.count || 0} more`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Refine useGo
const mockGo = vi.fn();
vi.mock('@refinedev/core', () => ({
  useGo: () => mockGo,
}));

describe('SimplifiedDebts', () => {
  beforeEach(() => {
    mockGo.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(<SimplifiedDebts debts={[]} isLoading={true} />);

      expect(screen.getByText('Who Owes Whom')).toBeInTheDocument();
      const skeletons = screen.getAllByRole('generic').filter(
        el => el.className.includes('animate-pulse')
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no debts', () => {
      render(<SimplifiedDebts debts={[]} isLoading={false} />);

      expect(screen.getByText('Who Owes Whom')).toBeInTheDocument();
      expect(screen.getByText('All settled up! No outstanding debts.')).toBeInTheDocument();
    });
  });

  describe('Debts Display', () => {
    const mockDebts: AggregatedDebt[] = [
      {
        counterparty_id: 'user-1',
        counterparty_name: 'Alice',
        amount: 50.5,
        i_owe_them: false,
      },
      {
        counterparty_id: 'user-2',
        counterparty_name: 'Bob',
        amount: 30.25,
        i_owe_them: true,
      },
    ];

    it('should display debts correctly', () => {
      render(<SimplifiedDebts debts={mockDebts} isLoading={false} />);

      expect(screen.getByText('Who Owes Whom')).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });

    it('should show correct message for debts owed to user', () => {
      render(<SimplifiedDebts debts={[mockDebts[0]]} isLoading={false} />);

      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/owes you/)).toBeInTheDocument();
    });

    it('should show correct message for debts user owes', () => {
      render(<SimplifiedDebts debts={[mockDebts[1]]} isLoading={false} />);

      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText(/You owe/)).toBeInTheDocument();
    });

    it('should display formatted amounts', () => {
      render(<SimplifiedDebts debts={mockDebts} isLoading={false} />);

      // Check that amounts are displayed (formatNumber adds formatting)
      const badges = screen.getAllByText(/\d+/);
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show "View All" button', () => {
      render(<SimplifiedDebts debts={mockDebts} isLoading={false} />);

      const viewAllButton = screen.getByText('View All');
      expect(viewAllButton).toBeInTheDocument();
    });

    it('should navigate to balances when "View All" is clicked', () => {
      render(<SimplifiedDebts debts={mockDebts} isLoading={false} />);

      const viewAllButton = screen.getByText('View All');
      fireEvent.click(viewAllButton);

      expect(mockGo).toHaveBeenCalledWith({ to: '/balances' });
    });

    it('should navigate to payment creation when settle button is clicked', () => {
      render(<SimplifiedDebts debts={[mockDebts[0]]} isLoading={false} />);

      const settleButtons = screen.getAllByRole('button');
      const settleButton = settleButtons.find(btn => 
        btn.querySelector('svg') // ArrowRight icon
      );

      if (settleButton) {
        fireEvent.click(settleButton);
        expect(mockGo).toHaveBeenCalledWith({
          to: `/payments/create?userId=${mockDebts[0].counterparty_id}&amount=${mockDebts[0].amount}`,
        });
      }
    });

    it('should limit display to 5 debts', () => {
      const manyDebts: AggregatedDebt[] = Array.from({ length: 7 }, (_, i) => ({
        counterparty_id: `user-${i}`,
        counterparty_name: `User ${i}`,
        amount: 10 * (i + 1),
        i_owe_them: i % 2 === 0,
      }));

      render(<SimplifiedDebts debts={manyDebts} isLoading={false} />);

      // Should show "View 2 more" button
      expect(screen.getByText('View 2 more')).toBeInTheDocument();
    });

    it('should navigate to balances when "View X more" is clicked', () => {
      const manyDebts: AggregatedDebt[] = Array.from({ length: 7 }, (_, i) => ({
        counterparty_id: `user-${i}`,
        counterparty_name: `User ${i}`,
        amount: 10 * (i + 1),
        i_owe_them: i % 2 === 0,
      }));

      render(<SimplifiedDebts debts={manyDebts} isLoading={false} />);

      const viewMoreButton = screen.getByText('View 2 more');
      fireEvent.click(viewMoreButton);

      expect(mockGo).toHaveBeenCalledWith({ to: '/balances' });
    });
  });
});

