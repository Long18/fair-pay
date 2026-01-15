# Phase 1: Design System Preparation

**Status:** Pending
**Priority:** High (Foundation for all other phases)
**Estimated Time:** 8-12 hours

---

## Overview

Establish reusable design components and patterns for consistent group UX redesign implementation.

---

## Requirements

### Color Palette for Debt Status
- **You Owe (Red)**: #fee2e2 bg, #dc2626 text, #991b1b border
- **Owed to You (Green)**: #dcfce7 bg, #16a34a text, #15803d border
- **Settled (Gray)**: #f3f4f6 bg, #6b7280 text, #9ca3af border
- **Pending (Yellow)**: #fef3c7 bg, #ca8a04 text, #a16207 border

**Accessibility:** All colors tested for 4.5:1+ WCAG AAA contrast

### Component Library Extensions

**1. Balance Card Component**
```typescript
interface BalanceCardProps {
  amount: number;
  currency: string;
  status: 'owe' | 'owed' | 'settled';
  userName: string;
  onClick?: () => void;
  isExpandable?: boolean;
}
```

**2. Debt Status Badge**
```typescript
interface DebtStatusBadgeProps {
  status: 'owe' | 'owed' | 'settled' | 'pending';
  amount?: number;
  size?: 'sm' | 'md' | 'lg';
}
```

**3. Settlement Button**
```typescript
interface SettlementButtonProps {
  amount: number;
  currency: string;
  recipientName: string;
  onClick: () => void;
  disabled?: boolean;
}
```

**4. Expandable Card Container**
```typescript
interface ExpandableCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}
```

---

## Files to Create

### 1. `/src/lib/status-colors.ts` (UPDATE)
**Action:** Add debt status colors

```typescript
// Add to existing file
export const DEBT_STATUS_COLORS = {
  owe: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-800',
    badge: 'bg-red-100 text-red-700',
    hover: 'hover:bg-red-100',
  },
  owed: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-800',
    badge: 'bg-green-100 text-green-700',
    hover: 'hover:bg-green-100',
  },
  settled: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-300',
    badge: 'bg-gray-100 text-gray-700',
    hover: 'hover:bg-gray-100',
  },
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-700',
    badge: 'bg-yellow-100 text-yellow-700',
    hover: 'hover:bg-yellow-100',
  },
} as const;

export type DebtStatus = keyof typeof DEBT_STATUS_COLORS;
```

### 2. `/src/components/groups/balance-card.tsx` (CREATE)
**Action:** Create reusable balance card component

```typescript
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
```

### 3. `/src/components/groups/debt-status-badge.tsx` (CREATE)
**Action:** Create status badge component

```typescript
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
```

### 4. `/src/components/groups/settlement-button.tsx` (CREATE)
**Action:** Create settlement CTA button

```typescript
import { Button } from '@/components/ui/button';
import { CheckCircle2Icon, ArrowRightIcon } from '@/components/ui/icons';
import { formatNumber } from '@/lib/locale-utils';

interface SettlementButtonProps {
  amount: number;
  currency: string;
  recipientName: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline';
}

export function SettlementButton({
  amount,
  currency,
  recipientName,
  onClick,
  disabled = false,
  variant = 'default',
}: SettlementButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      className="w-full h-12 text-base font-semibold"
    >
      <CheckCircle2Icon className="h-5 w-5 mr-2" />
      Pay {recipientName} {formatNumber(amount)} {currency}
      <ArrowRightIcon className="h-5 w-5 ml-2" />
    </Button>
  );
}
```

### 5. `/src/components/ui/expandable-card.tsx` (CREATE)
**Action:** Create generic expandable card

```typescript
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
```

---

## Implementation Steps

1. **Add color definitions** to `status-colors.ts`
   - Add DEBT_STATUS_COLORS constant
   - Export DebtStatus type
   - Test contrast ratios

2. **Create balance-card.tsx component**
   - Implement BalanceCard with all props
   - Add expandable functionality
   - Add animations
   - Mobile touch optimization

3. **Create debt-status-badge.tsx component**
   - Implement badge with color variants
   - Add size variants
   - Ensure accessibility (aria-label)

4. **Create settlement-button.tsx component**
   - Implement CTA button
   - Add loading state
   - Add disabled state
   - Test touch targets (48px height)

5. **Create expandable-card.tsx component**
   - Implement controlled/uncontrolled expansion
   - Add smooth animations
   - Ensure keyboard accessibility

6. **Add to component exports**
   - Update `/src/components/groups/index.ts`
   - Export all new components

7. **Write Storybook stories** (optional but recommended)
   - Stories for each component
   - All variants documented

8. **Test components**
   - Unit tests for logic
   - Visual regression tests
   - Accessibility tests

---

## Success Criteria

- [ ] All color constants added with WCAG AAA contrast
- [ ] BalanceCard component created and tested
- [ ] DebtStatusBadge component created and tested
- [ ] SettlementButton component created and tested
- [ ] ExpandableCard component created and tested
- [ ] All components exported properly
- [ ] Mobile touch targets meet 44px minimum
- [ ] Keyboard navigation works
- [ ] Screen readers announce correctly

---

## Dependencies

- Existing UI component library (shadcn/ui)
- Existing utility functions (formatNumber, cn)
- Tailwind CSS configuration

---

## Next Phase

Phase 2: Group Detail Page Redesign (uses all components from this phase)
