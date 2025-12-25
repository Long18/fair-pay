import { useBalance } from '@/hooks/useBalance';

/**
 * Utility hook for formatted balance display
 * Provides pre-formatted strings and status indicators for UI display
 */
export const useFormattedBalance = () => {
  const { totalOwedToMe, totalIOwe, netBalance, isLoading } = useBalance();

  return {
    // Formatted strings for display
    formattedOwedToMe: `₫${totalOwedToMe.toLocaleString('vi-VN')}`,
    formattedIOwe: `₫${totalIOwe.toLocaleString('vi-VN')}`,
    formattedNetBalance: `₫${Math.abs(netBalance).toLocaleString('vi-VN')}`,

    // Status indicators
    isInDebt: netBalance < 0,
    isCreditor: netBalance > 0,
    isSettledUp: netBalance === 0,

    // Status messages
    statusMessage: getStatusMessage(netBalance),

    // Raw values
    totalOwedToMe,
    totalIOwe,
    netBalance,

    isLoading,
  };
};

function getStatusMessage(netBalance: number): string {
  if (netBalance === 0) return 'All settled up!';
  if (netBalance > 0) return `You are owed ₫${netBalance.toLocaleString('vi-VN')}`;
  return `You owe ₫${Math.abs(netBalance).toLocaleString('vi-VN')}`;
}
