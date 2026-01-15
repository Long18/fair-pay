import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDownIcon } from '@/components/ui/icons';
import { DEBT_STATUS_COLORS } from '@/lib/status-colors';
import { formatNumber } from '@/lib/locale-utils';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  amount: number;
  currency: string;
  status: 'owe' | 'owed' | 'settled';
  userName: string;
  userAvatar?: string;
  onClick?: () => void;
  isExpandable?: boolean;
  children?: React.ReactNode;
}

export function BalanceCard({
  amount,
  currency,
  status,
  userName,
  userAvatar,
  onClick,
  isExpandable = false,
  children,
}: BalanceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colors = DEBT_STATUS_COLORS[status];

  const handleClick = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
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
              <p className="font-medium">{userName}</p>
              <p className={cn('text-sm', colors.text)}>
                {status === 'owe' ? 'You owe' : status === 'owed' ? 'Owes you' : 'Settled'}
              </p>
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
