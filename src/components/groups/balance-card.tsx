import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDownIcon, FlameIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/ui/icons';
import { DEBT_STATUS_COLORS } from '@/lib/status-colors';
import { formatNumber } from '@/lib/locale-utils';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/use-haptics';
import { PriorityLevel, getPriorityLabel, getPriorityColors } from '@/lib/priority-calculator';

interface BalanceCardProps {
  amount: number;
  currency: string;
  status: 'owe' | 'owed' | 'settled';
  userName: string;
  userAvatar?: string;
  onClick?: () => void;
  isExpandable?: boolean;
  children?: React.ReactNode;
  priority?: PriorityLevel;
  lastActivity?: string;
  expenseCount?: number;
}

const PriorityIcon = ({ priority }: { priority: PriorityLevel }) => {
  switch (priority) {
    case 'high':
      return <FlameIcon className="h-3 w-3" />;
    case 'medium':
      return <AlertTriangleIcon className="h-3 w-3" />;
    case 'low':
      return <CheckCircleIcon className="h-3 w-3" />;
  }
};

export function BalanceCard({
  amount,
  currency,
  status,
  userName,
  userAvatar,
  onClick,
  isExpandable = false,
  children,
  priority,
  lastActivity,
  expenseCount,
}: BalanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tap } = useHaptics();
  const colors = DEBT_STATUS_COLORS[status];
  const priorityColors = priority ? getPriorityColors(priority) : null;

  const handleClick = () => {
    tap();
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
  };

  // Format relative time for last activity
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        colors.bg,
        colors.border,
        colors.hover,
        isExpandable && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {userAvatar && (
              <Avatar>
                <AvatarImage src={userAvatar} />
                <AvatarFallback>{userName[0]}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{userName}</p>
                {priority && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs px-1.5 py-0.5',
                      priorityColors?.border,
                      priorityColors?.text
                    )}
                  >
                    <PriorityIcon priority={priority} />
                    <span className="ml-1">{getPriorityLabel(priority)}</span>
                  </Badge>
                )}
              </div>
              <p className={cn('text-sm', colors.text)}>
                {status === 'owe' ? 'You owe' : status === 'owed' ? 'Owes you' : 'Settled'}
              </p>
              {(lastActivity || expenseCount) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lastActivity && `Last activity: ${formatRelativeTime(lastActivity)}`}
                  {lastActivity && expenseCount && ' • '}
                  {expenseCount && `${expenseCount} expense(s)`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-bold', colors.text)}>
              {formatNumber(Math.abs(amount))} {currency}
            </span>
            {isExpandable && (
              <ChevronDownIcon
                className={cn(
                  'h-4 w-4 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            )}
          </div>
        </div>
        {isExpanded && children && (
          <div className="mt-4 pt-4 border-t">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
