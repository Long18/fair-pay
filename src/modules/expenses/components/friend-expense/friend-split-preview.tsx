import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { ArrowRightIcon } from "@/components/ui/icons";
import { paidStatusIcon, owesYouIcon } from "@/assets/expense-friend";
import { symbolFor, initialsFor } from "./utils";

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface Participant {
  user_id?: string;
  pending_email?: string;
  computed_amount: number;
}

interface FriendSplitPreviewProps {
  members: Member[];
  currentUserId: string;
  paidByUserId: string;
  amount?: number;
  currency: string;
  splitMethod: "equal" | "exact" | "percentage";
  isLoan: boolean;
  participants: Participant[];
  className?: string;
}

export const FriendSplitPreview: React.FC<FriendSplitPreviewProps> = ({
  members,
  currentUserId,
  paidByUserId,
  amount,
  currency,
  splitMethod,
  isLoan,
  participants,
  className,
}) => {
  const { t } = useTranslation();

  const payer = members.find((m) => m.id === paidByUserId);
  const debtor = members.find((m) => m.id !== paidByUserId);

  const debtorOwes = useMemo(() => {
    if (!amount || amount <= 0 || !debtor) return 0;
    if (isLoan) return amount; // loan: borrower owes the full amount
    const debtorParticipant = participants.find((p) => p.user_id === debtor.id);
    if (debtorParticipant?.computed_amount !== undefined) {
      return Math.max(0, debtorParticipant.computed_amount);
    }
    // Fallback to equal split between two people
    return amount / 2;
  }, [amount, debtor, isLoan, participants]);

  const payerIsCurrentUser = paidByUserId === currentUserId;
  const sym = symbolFor(currency);

  const methodBadge = isLoan
    ? t("expenses.loanToggle", { defaultValue: "Loan" })
    : splitMethod === "equal"
    ? t("expenses.splitEqual", { defaultValue: "Split equally" })
    : splitMethod === "exact"
    ? t("expenses.splitExact", { defaultValue: "Exact amounts" })
    : t("expenses.splitPercentage", { defaultValue: "Percentage" });

  if (!payer || !debtor) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/80 backdrop-blur p-4 shadow-sm",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={t("expenses.friendSplitPreviewLabel", { defaultValue: "Split outcome preview" })}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t("expenses.outcome", { defaultValue: "Outcome" })}
        </span>
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
          {methodBadge}
        </Badge>
      </div>

      <div className="flex items-stretch gap-3">
        {/* Payer side */}
        <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-emerald-300/70 dark:border-emerald-600/50">
              <AvatarImage src={payer.avatar_url || undefined} alt={payer.full_name} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200 text-xs">
                {initialsFor(payer.full_name)}
              </AvatarFallback>
            </Avatar>
            <img
              src={paidStatusIcon}
              alt=""
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 h-5 w-5 drop-shadow"
            />
          </div>
          <p className="text-[11px] font-medium truncate max-w-full text-foreground">
            {payerIsCurrentUser ? t("common.you", { defaultValue: "You" }) : payer.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("expenses.paid", { defaultValue: "Paid" })}
          </p>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {amount && amount > 0 ? `${formatNumber(amount)} ${sym}` : "—"}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center px-1" aria-hidden="true">
          <div className="h-px w-8 bg-gradient-to-r from-emerald-300 via-muted-foreground/40 to-amber-300" />
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground my-0.5" />
          <div className="h-px w-8 bg-gradient-to-r from-emerald-300 via-muted-foreground/40 to-amber-300" />
        </div>

        {/* Debtor side */}
        <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-amber-300/70 dark:border-amber-600/50">
              <AvatarImage src={debtor.avatar_url || undefined} alt={debtor.full_name} />
              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 text-xs">
                {initialsFor(debtor.full_name)}
              </AvatarFallback>
            </Avatar>
            <img
              src={owesYouIcon}
              alt=""
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 h-5 w-5 drop-shadow"
            />
          </div>
          <p className="text-[11px] font-medium truncate max-w-full text-foreground">
            {debtor.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {payerIsCurrentUser
              ? t("expenses.owesYou", { defaultValue: "Owes you" })
              : t("expenses.youOwe", { defaultValue: "You owe" })}
          </p>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {debtorOwes > 0 ? `${formatNumber(debtorOwes)} ${sym}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
};
