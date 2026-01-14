import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * ResponsiveDialog
 *
 * A dialog that adapts to mobile devices by becoming a bottom sheet.
 * On desktop: Standard centered dialog
 * On mobile: Bottom sheet that slides up from bottom
 *
 * @example
 * <ResponsiveDialog open={open} onOpenChange={setOpen}>
 *   <ResponsiveDialog.Header title="Create Expense" description="Add a new expense" />
 *   <ResponsiveDialog.Content>
 *     <Form />
 *   </ResponsiveDialog.Content>
 * </ResponsiveDialog>
 */

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  className,
}: ResponsiveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Desktop: standard dialog
          "sm:max-w-[500px]",
          // Mobile: bottom sheet
          "max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0",
          "max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0",
          "max-sm:rounded-t-2xl max-sm:rounded-b-none",
          "max-sm:border-t max-sm:border-x-0 max-sm:border-b-0",
          "max-sm:data-[state=closed]:slide-out-to-bottom",
          "max-sm:data-[state=open]:slide-in-from-bottom",
          "max-sm:max-h-[85vh] max-sm:overflow-y-auto",
          className
        )}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-muted-foreground/20 rounded-full" />

        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * ResponsiveDialog.Header
 *
 * Header section for responsive dialog
 */
interface ResponsiveDialogHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

function ResponsiveDialogHeader({
  title,
  description,
  className,
}: ResponsiveDialogHeaderProps) {
  return (
    <DialogHeader className={cn("max-sm:pt-6", className)}>
      <DialogTitle>{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
  );
}

/**
 * ResponsiveDialog.Content
 *
 * Content area for responsive dialog
 */
interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveDialogContent({
  children,
  className,
}: ResponsiveDialogContentProps) {
  return <div className={cn("py-4", className)}>{children}</div>;
}

/**
 * ResponsiveDialog.Footer
 *
 * Footer section for responsive dialog actions
 */
interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

function ResponsiveDialogFooter({
  children,
  className,
}: ResponsiveDialogFooterProps) {
  return (
    <div className={cn("flex gap-2 justify-end max-sm:flex-col-reverse max-sm:pt-4", className)}>
      {children}
    </div>
  );
}

// Compound component pattern
ResponsiveDialog.Header = ResponsiveDialogHeader;
ResponsiveDialog.Content = ResponsiveDialogContent;
ResponsiveDialog.Footer = ResponsiveDialogFooter;

export { ResponsiveDialogHeader, ResponsiveDialogContent, ResponsiveDialogFooter };
