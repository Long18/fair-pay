import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon, XCircleIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { PrepaidCoverageInfo, PrepaidCoverageStatus } from '../types/recurring';
import { formatPrepaidCoverage } from '../utils/prepaid-calculations';
import { semanticStatusColors, oweStatusColors } from '@/lib/status-colors';

interface PrepaidStatusBadgeProps {
  coverageInfo: PrepaidCoverageInfo;
  showTooltip?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<PrepaidCoverageStatus, {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.FC<{ className?: string; size?: number }>;
  colorClass: string;
}> = {
  none: {
    variant: 'outline',
    icon: ClockIcon,
    colorClass: oweStatusColors.neutral.icon,
  },
  active: {
    variant: 'default',
    icon: CheckCircle2Icon,
    colorClass: semanticStatusColors.success.icon,
  },
  expiring_soon: {
    variant: 'secondary',
    icon: AlertTriangleIcon,
    colorClass: semanticStatusColors.warning.icon,
  },
  expired: {
    variant: 'destructive',
    icon: XCircleIcon,
    colorClass: semanticStatusColors.error.icon,
  },
};

/**
 * PrepaidStatusBadge - Displays the prepaid coverage status for a recurring expense
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5
 * - Display prepaid status (none, active, expiring_soon, expired)
 * - Show remaining periods for active coverage
 * - Show warning indicator for expiring_soon
 */
export function PrepaidStatusBadge({
  coverageInfo,
  showTooltip = true,
  className,
}: PrepaidStatusBadgeProps) {
  const { t, i18n } = useTranslation();
  const { status, prepaid_until, remaining_periods } = coverageInfo;
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const language = i18n.language === 'vi' ? 'vi' : 'en';

  const getStatusLabel = (): string => {
    switch (status) {
      case 'none':
        return t('recurring.prepaid.statusNone', 'No prepaid');
      case 'active':
        return t('recurring.prepaid.remainingPeriods', { count: remaining_periods });
      case 'expiring_soon':
        return t('recurring.prepaid.expiringSoon', 'Expiring soon');
      case 'expired':
        return t('recurring.prepaid.statusExpired', 'Expired');
      default:
        return '';
    }
  };

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1 whitespace-nowrap',
        status === 'active' && `${semanticStatusColors.success.bg} ${semanticStatusColors.success.text} ${semanticStatusColors.success.border}`,
        status === 'expiring_soon' && `${semanticStatusColors.warning.bg} ${semanticStatusColors.warning.text} ${semanticStatusColors.warning.border}`,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', config.colorClass)} size={12} />
      <span>{getStatusLabel()}</span>
    </Badge>
  );

  if (!showTooltip || status === 'none') {
    return badge;
  }

  const tooltipContent = prepaid_until
    ? formatPrepaidCoverage(prepaid_until, language)
    : t('recurring.prepaid.noCoverage', 'No prepaid coverage');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
          {status === 'active' && remaining_periods > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('recurring.prepaid.remainingPeriods', { count: remaining_periods })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
