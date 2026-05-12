import { type ReactNode } from "react";
import { Loader2Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

interface AdminCrudSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: () => void;
  children: ReactNode;
}

export function AdminCrudSheet({
  open,
  onOpenChange,
  title,
  description,
  isSubmitting = false,
  submitLabel = "Save",
  onSubmit,
  children,
}: AdminCrudSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            )}
            {submitLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
