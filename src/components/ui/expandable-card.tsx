import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChevronDownIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableCard({
  title,
  subtitle,
  badge,
  expanded: controlledExpanded,
  onToggle,
  children,
  className,
}: ExpandableCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardHeader
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <ChevronDownIcon
            className={cn(
              'h-5 w-5 transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}
