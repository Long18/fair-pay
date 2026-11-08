import type { ComponentType, ReactNode } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** Dropdown + dialog payment pickers share width / surface rhythm (overlay.md). */
export const paymentMethodDropdownContentClass =
  'min-w-56 w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-popover p-1 shadow-md';

export const paymentMethodSheetClass = 'sm:max-w-md';

interface PaymentMethodMenuItemProps {
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  iconWrapClassName?: string;
  title: string;
  description: string;
  trailing?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function PaymentMethodMenuItem({
  icon: Icon,
  iconClassName,
  iconWrapClassName,
  title,
  description,
  trailing,
  onClick,
  disabled,
}: PaymentMethodMenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 focus:bg-accent"
    >
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60',
          iconWrapClassName,
        )}
      >
        <Icon className={cn('size-4 shrink-0', iconClassName)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-sm font-medium leading-snug">{title}</span>
          {trailing}
        </div>
        <span className="text-sm text-muted-foreground leading-snug">{description}</span>
      </div>
    </DropdownMenuItem>
  );
}
