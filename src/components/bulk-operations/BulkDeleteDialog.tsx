import React from "react";
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
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  selectedCount: number;
  isLoading?: boolean;
}

export const BulkDeleteDialog: React.FC<BulkDeleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("bulk.deleteTitle", "Delete Selected Expenses?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              {t(
                "bulk.deleteDescription",
                "This will permanently delete the selected expenses and their splits."
              )}
            </p>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {t("bulk.expensesToDelete", "Expenses to delete:")}
                </span>
                <Badge variant="destructive">{selectedCount}</Badge>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>{t("common.warning", "Warning")}:</strong>{" "}
                {t(
                  "bulk.deleteWarning",
                  "This action cannot be undone. All associated splits and balances will be recalculated."
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading
              ? t("bulk.deleting", "Deleting...")
              : t("bulk.confirmDelete", "Delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
