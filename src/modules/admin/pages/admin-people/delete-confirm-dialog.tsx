import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangleIcon, Loader2Icon } from "@/components/ui/icons";
import { useAdminTranslation } from "../../i18n";

export function DeleteConfirmDialog({
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  confirmLabel,
  confirmDestructive = true,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  confirmLabel?: string;
  confirmDestructive?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={
              confirmDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel ?? tAdmin("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
