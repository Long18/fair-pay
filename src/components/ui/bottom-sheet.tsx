/**
 * Bottom Sheet Component
 *
 * Responsive component that renders as a bottom sheet (drawer) on mobile
 * and as a centered dialog on desktop.
 *
 * Uses vaul for the drawer implementation (smooth, performant).
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Responsive modal that uses bottom sheet on mobile and dialog on desktop
 *
 * @example
 * <BottomSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Settle Debt"
 *   description="Record a payment"
 *   footer={<Button>Confirm</Button>}
 * >
 *   <form>...</form>
 * </BottomSheet>
 */
export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  footer,
  className,
}: BottomSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn('max-h-[90vh]', className)}>
          {(title || description) && (
            <DrawerHeader>
              {title && <DrawerTitle>{title}</DrawerTitle>}
              {description && (
                <DrawerDescription>{description}</DrawerDescription>
              )}
            </DrawerHeader>
          )}
          <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && (
            <DrawerFooter className="safe-bottom">{footer}</DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to get bottom sheet props for conditional rendering
 *
 * @example
 * const { isMobile, SheetComponent, HeaderComponent, ... } = useBottomSheet();
 *
 * return (
 *   <SheetComponent open={open} onOpenChange={setOpen}>
 *     <ContentComponent>...</ContentComponent>
 *   </SheetComponent>
 * );
 */
export function useBottomSheet() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return {
    isMobile,
    SheetComponent: isMobile ? Drawer : Dialog,
    ContentComponent: isMobile ? DrawerContent : DialogContent,
    HeaderComponent: isMobile ? DrawerHeader : DialogHeader,
    TitleComponent: isMobile ? DrawerTitle : DialogTitle,
    DescriptionComponent: isMobile ? DrawerDescription : DialogDescription,
    FooterComponent: isMobile ? DrawerFooter : DialogFooter,
  };
}
