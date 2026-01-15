import { Badge } from '@/components/ui/badge';
import { DEBT_STATUS_COLORS } from '@/lib/status-colors';
import { formatNumber } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';

interface DebtStatusBadgeProps {
  status: 'owe' | 'owed' | 'settled' | 'pending';
  amount?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DebtStatusBadge({
  status,
  amount,
  currency,
  size = 'md',
}: DebtStatusBadgeProps) {
  const colors = DEBT_STATUS_COLORS[status];
  const labels = {
    owe: 'YOU OWE',
    owed: 'OWES YOU',
    settled: 'SETTLED',
    pending: 'PENDING',
  };

  return (
    <Badge
      className={cn(
        colors.badge,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-3 py-1',
        size === 'lg' && 'text-base px-4 py-1.5'
      )}
    >
      {labels[status]}
      {amount !== undefined && currency && (
        <span className="ml-1 font-bold">
          {formatNumber(Math.abs(amount))} {currency}
        </span>
      )}
    </Badge>
  );
}
