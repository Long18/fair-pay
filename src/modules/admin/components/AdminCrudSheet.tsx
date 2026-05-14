import { type ReactNode } from "react";
import { Loader2Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../i18n";

interface AdminCrudDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: () => void;
  children: ReactNode;
  contentClassName?: string;
}

export function AdminCrudDialog({
  open,
  onOpenChange,
  title,
  description,
  isSubmitting = false,
  submitLabel = "Save",
  onSubmit,
  children,
  contentClassName,
}: AdminCrudDialogProps) {
  const { tAdmin } = useAdminTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 p-0 sm:max-w-[560px]",
          contentClassName,
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row gap-2 justify-end">
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tAdmin("common.cancel")}
          </Button>
          <Button className="cursor-pointer" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const AdminCrudSheet = AdminCrudDialog;
