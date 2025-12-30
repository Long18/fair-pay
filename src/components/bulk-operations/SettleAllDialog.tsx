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
import { formatNumber } from "@/lib/locale-utils";

interface SettleAllDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  splitsCount: number;
  totalAmount: number;
  isLoading?: boolean;
}

export const SettleAllDialog: React.FC<SettleAllDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  splitsCount,
  totalAmount,
  isLoading = false,
}) => {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("bulk.settleAllTitle", "Settle All Debts?")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              {t(
                "bulk.settleAllDescription",
                "This will mark all outstanding debts in this group as settled."
              )}
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {t("bulk.debtsToSettle", "Debts to settle:")}
                </span>
                <Badge variant="secondary">{splitsCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {t("bulk.totalAmount", "Total amount:")}
                </span>
                <Badge variant="secondary" className="text-base">
                  {formatNumber(totalAmount)} ₫
                </Badge>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>{t("common.warning", "Warning")}:</strong>{" "}
                {t(
                  "bulk.settleAllWarning",
                  "This action cannot be undone. All debts will be marked as paid."
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {t("common.cancel", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading
              ? t("bulk.settling", "Settling...")
              : t("bulk.confirmSettle", "Settle All")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

