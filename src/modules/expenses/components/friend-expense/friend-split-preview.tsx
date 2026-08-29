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
  const lender = isLoan ? payer : undefined;
  const borrower = isLoan ? debtor : undefined;

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
    ? t("expenses.loanToggle")
    : splitMethod === "equal"
    ? t("expenses.splitEqual")
    : splitMethod === "exact"
    ? t("expenses.splitExact")
    : t("expenses.splitPercentage");

  if (!payer || !debtor) {
    return null;
  }

  const leftPerson = isLoan ? lender! : payer;
  const rightPerson = isLoan ? borrower! : debtor;
  const leftIsCurrentUser = leftPerson.id === currentUserId;
  const rightIsCurrentUser = rightPerson.id === currentUserId;

  return (
    <div
      className={cn(
        "rounded-2xl border backdrop-blur p-4 shadow-sm",
        isLoan
          ? "border-amber-400/40 bg-amber-50/40 dark:bg-amber-950/20"
          : "border-border/60 bg-card/80",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={t("expenses.friendSplitPreviewLabel")}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {t("expenses.outcome")}
        </span>
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
          {methodBadge}
        </Badge>
      </div>

      <div className="flex items-stretch gap-3">
        {/* Lender / payer side */}
        <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
          <div className="relative">
            <Avatar className={cn(
              "h-12 w-12 border-2",
              isLoan
                ? "border-amber-400/70 dark:border-amber-600/50"
                : "border-emerald-300/70 dark:border-emerald-600/50",
            )}>
              <AvatarImage src={leftPerson.avatar_url || undefined} alt={leftPerson.full_name} />
              <AvatarFallback className={cn(
                "text-xs",
                isLoan
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
              )}>
                {initialsFor(leftPerson.full_name)}
              </AvatarFallback>
            </Avatar>
            {!isLoan && (
              <img
                src={paidStatusIcon}
                alt=""
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 h-5 w-5 drop-shadow"
              />
            )}
          </div>
          <p className="text-[11px] font-medium truncate max-w-full text-foreground">
            {leftIsCurrentUser ? t("common.you") : leftPerson.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isLoan ? t("expenses.lender") : t("expenses.paid")}
          </p>
          <p className={cn(
            "text-sm font-bold tabular-nums",
            isLoan
              ? "text-amber-700 dark:text-amber-300"
              : "text-emerald-700 dark:text-emerald-300",
          )}>
            {amount && amount > 0 ? `${formatNumber(amount)} ${sym}` : "—"}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center px-1" aria-hidden="true">
          <div className={cn(
            "h-px w-8 bg-gradient-to-r",
            isLoan
              ? "from-amber-300 via-muted-foreground/40 to-amber-300"
              : "from-emerald-300 via-muted-foreground/40 to-amber-300",
          )} />
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground my-0.5" />
          <div className={cn(
            "h-px w-8 bg-gradient-to-r",
            isLoan
              ? "from-amber-300 via-muted-foreground/40 to-amber-300"
              : "from-emerald-300 via-muted-foreground/40 to-amber-300",
          )} />
        </div>

        {/* Borrower / debtor side */}
        <div className="flex-1 min-w-0 flex flex-col items-center text-center gap-1.5">
          <div className="relative">
            <Avatar className={cn(
              "h-12 w-12 border-2",
              isLoan
                ? "border-amber-400/70 dark:border-amber-600/50"
                : "border-amber-300/70 dark:border-amber-600/50",
            )}>
              <AvatarImage src={rightPerson.avatar_url || undefined} alt={rightPerson.full_name} />
              <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 text-xs">
                {initialsFor(rightPerson.full_name)}
              </AvatarFallback>
            </Avatar>
            {!isLoan && (
              <img
                src={owesYouIcon}
                alt=""
                aria-hidden="true"
                className="absolute -bottom-1 -right-1 h-5 w-5 drop-shadow"
              />
            )}
          </div>
          <p className="text-[11px] font-medium truncate max-w-full text-foreground">
            {rightIsCurrentUser ? t("common.you") : rightPerson.full_name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {isLoan
              ? t("expenses.borrower")
              : payerIsCurrentUser
                ? t("expenses.owesYou")
                : t("expenses.youOwe")}
          </p>
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
            {debtorOwes > 0 ? `${formatNumber(debtorOwes)} ${sym}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
};
