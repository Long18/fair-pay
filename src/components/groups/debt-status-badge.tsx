import { Badge } from '@/components/ui/badge';
import { DEBT_STATUS_COLORS } from '@/lib/status-colors';
import { formatNumber } from '@/lib/locale-utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/ui/use-reduced-motion';
import { SPRING_DEFAULT } from '@/lib/animation';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const colors = DEBT_STATUS_COLORS[status];

  const getLabel = () => {
    switch (status) {
      case 'owe':
        return t('status.debtBadge.owe');
      case 'owed':
        return t('status.debtBadge.owed');
      case 'settled':
        return t('status.debtBadge.settled');
      case 'pending':
        return t('status.debtBadge.pending');
      default: {
        const _exhaustive: never = status;
        return _exhaustive;
      }
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_DEFAULT}
      style={{ display: 'inline-flex' }}
    >
      <Badge
        className={cn(
          colors.badge,
          size === 'sm' && 'text-xs px-2 py-0.5',
          size === 'md' && 'text-sm px-3 py-1',
          size === 'lg' && 'text-base px-4 py-1.5'
        )}
      >
        {getLabel()}
        {amount !== undefined && currency && (
          <span className="ml-1 font-bold">
            {formatNumber(Math.abs(amount))} {currency}
          </span>
        )}
      </Badge>
    </motion.div>
  );
}
