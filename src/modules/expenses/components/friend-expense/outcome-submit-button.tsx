import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import { symbolFor } from "./utils";

interface OutcomeSubmitButtonProps {
  isLoading?: boolean;
  isEdit?: boolean;
  disabled?: boolean;
  // Outcome data
  debtorOwes: number;
  debtorName?: string;
  counterpartyName?: string;
  currency: string;
  payerIsCurrentUser: boolean;
  isLoan?: boolean;
  // Validation hints (drive the inline message)
  hasAmount: boolean;
  amountIsValid: boolean;
  isSplitValid: boolean;
  className?: string;
}

export const OutcomeSubmitButton: React.FC<OutcomeSubmitButtonProps> = ({
  isLoading,
  isEdit,
  disabled,
  debtorOwes,
  debtorName,
  counterpartyName,
  currency,
  payerIsCurrentUser,
  isLoan = false,
  hasAmount,
  amountIsValid,
  isSplitValid,
  className,
}) => {
  const { t } = useTranslation();
  const sym = symbolFor(currency);

  const baseLabel = isEdit ? t("expenses.updateExpense") : t("expenses.createExpense");

  let outcomeLine: string | null = null;
  if (!hasAmount) {
    outcomeLine = t("expenses.enterAmountToContinue");
  } else if (!amountIsValid) {
    outcomeLine = t("expenses.fixAmount");
  } else if (!isSplitValid) {
    outcomeLine = t("expenses.fixSplit");
  } else if (debtorOwes > 0 && (debtorName || counterpartyName)) {
    const friendShort = (isLoan ? counterpartyName : debtorName)?.split(" ").slice(-1)[0]
      || counterpartyName
      || debtorName
      || "";
    if (isLoan) {
      outcomeLine = payerIsCurrentUser
        ? t("expenses.outcomeYouLent", {
            name: friendShort,
            amount: formatNumber(debtorOwes),
            sym,
          })
        : t("expenses.outcomeTheyLent", {
            name: friendShort,
            amount: formatNumber(debtorOwes),
            sym,
          });
    } else {
      outcomeLine = payerIsCurrentUser
        ? t("expenses.outcomeOwesYou", {
            name: friendShort,
            amount: formatNumber(debtorOwes),
            sym,
          })
        : t("expenses.outcomeYouOwe", {
            name: friendShort,
            amount: formatNumber(debtorOwes),
            sym,
          });
    }
  }

  return (
    <Button
      type="submit"
      disabled={isLoading || disabled}
      className={cn(
        "w-full h-14 font-medium text-base flex flex-col items-center justify-center gap-0 leading-tight",
        className
      )}
      aria-live="polite"
    >
      {isLoading ? (
        <span className="flex items-center">
          <span className="animate-spin mr-2" aria-hidden="true">⏳</span>
          {isEdit ? t("expenses.updating") : t("expenses.creating")}
        </span>
      ) : (
        <>
          <span className="flex items-center text-base">
            <CheckIcon className="h-5 w-5 mr-2" aria-hidden="true" />
            {baseLabel}
          </span>
          {outcomeLine && (
            <span className="text-xs font-normal opacity-90 mt-0.5 truncate max-w-full px-2">
              · {outcomeLine}
            </span>
          )}
        </>
      )}
    </Button>
  );
};
