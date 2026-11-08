import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BankSettings } from '@/modules/settings/components/bank-settings';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

vi.mock('@refinedev/core', () => ({
  useGo: () => vi.fn(),
}));

vi.mock('@/modules/admin/hooks/use-admin-access', () => ({
  useAdminAccess: vi.fn(),
}));

vi.mock('@/hooks/use-haptics', () => ({
  useHaptics: () => ({ tap: vi.fn(), success: vi.fn(), warning: vi.fn() }),
}));

vi.mock('@/modules/settings/components/vietqr-bank-settings-form', () => ({
  VietqrBankSettingsForm: () => <div data-testid="vietqr-form">VietQR Form</div>,
}));

import { useAdminAccess } from '@/modules/admin/hooks/use-admin-access';

describe('BankSettings gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows admin-only message for non-admin users', () => {
    vi.mocked(useAdminAccess).mockReturnValue({
      isAdmin: false,
      isModerator: false,
      isStaff: false,
      role: 'user',
      isLoading: false,
      canEnterAdmin: false,
      canViewOverview: false,
      canViewPeople: false,
      canEditPeopleBasics: false,
      canManagePeople: false,
      canViewTransactions: false,
      canManageOwnTransactions: false,
      canDeleteTransactions: false,
      canViewGroups: false,
      canManageGroups: false,
      canManageReactions: false,
      canViewTracking: false,
      canViewAuditLogs: false,
      canUseDevtool: false,
      canViewGrowth: false,
      canViewRetention: false,
      canModerateContent: false,
      canAccessDevTool: false,
    });

    render(<BankSettings />);

    expect(
      screen.getByText(
        'VietQR bank setup is available to administrators only. Configure MoMo to receive payments from friends.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('vietqr-form')).not.toBeInTheDocument();
  });

  it('shows VietQR form for admin users', () => {
    vi.mocked(useAdminAccess).mockReturnValue({
      isAdmin: true,
      isModerator: false,
      isStaff: true,
      role: 'admin',
      isLoading: false,
      canEnterAdmin: true,
      canViewOverview: true,
      canViewPeople: true,
      canEditPeopleBasics: true,
      canManagePeople: true,
      canViewTransactions: true,
      canManageOwnTransactions: true,
      canDeleteTransactions: true,
      canViewGroups: true,
      canManageGroups: true,
      canManageReactions: true,
      canViewTracking: true,
      canViewAuditLogs: true,
      canUseDevtool: true,
      canViewGrowth: true,
      canViewRetention: true,
      canModerateContent: true,
      canAccessDevTool: true,
    });

    render(<BankSettings />);

    expect(screen.getByTestId('vietqr-form')).toBeInTheDocument();
  });
});
