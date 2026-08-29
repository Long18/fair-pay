import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HandCoinsIcon, ArrowRightIcon, RefreshCcwIcon } from "@/components/ui/icons";
import { loanModeIcon } from "@/assets/expense-friend";
import type { ExpenseFormSchema } from "../expense-form";
import { initialsFor } from "./utils";

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface FriendLoanSectionProps {
  members: Member[];
  currentUserId: string;
  isLoan: boolean;
}

export const FriendLoanSection: React.FC<FriendLoanSectionProps> = ({
  members,
  currentUserId,
  isLoan,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const { control, watch, setValue } = useFormContext<ExpenseFormSchema>();

  const paidByUserId = watch("paid_by_user_id");
  const friend = members.find((m) => m.id !== currentUserId);
  const friendId = friend?.id;
  const friendName = friend?.full_name ?? t("expenses.friend");
  const youLabel = t("common.you");

  const lenderIsCurrentUser = paidByUserId === currentUserId;

  const setLender = (userId: string) => {
    if (paidByUserId === userId) return;
    tap();
    setValue("paid_by_user_id", userId, { shouldDirty: true, shouldValidate: true });
  };

  const swapDirection = () => {
    if (!friendId) return;
    tap();
    setValue(
      "paid_by_user_id",
      lenderIsCurrentUser ? friendId : currentUserId,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  if (!friendId) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 shadow-sm overflow-hidden transition-colors",
        isLoan
          ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20"
          : "border-border/50 bg-card/50",
      )}
    >
      <div className="px-4 py-3 space-y-3">
        <FormField
          control={control}
          name="is_loan"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-3 space-y-0">
              <div className="space-y-0.5 min-w-0">
                <FormLabel className="flex items-center gap-2 text-sm">
                  {isLoan ? (
                    <img src={loanModeIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
                  ) : (
                    <HandCoinsIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t("expenses.loanToggle")}
                </FormLabel>
                <FormDescription className="text-xs">
                  {t("expenses.loanToggleDescription")}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(v) => { tap(); field.onChange(v); }}
                  aria-label={t("expenses.loanToggle")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isLoan && (
          <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-amber-900/80 dark:text-amber-100/80">
                {t("expenses.loanDirectionLabel")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-100/80 dark:hover:bg-amber-900/40"
                onClick={swapDirection}
                aria-label={t("expenses.loanDirectionSwapAria")}
              >
                <RefreshCcwIcon className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                {t("expenses.loanDirectionSwap")}
              </Button>
            </div>

            <div
              role="radiogroup"
              aria-label={t("expenses.loanDirectionLabel")}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <LoanDirectionOption
                selected={lenderIsCurrentUser}
                onSelect={() => setLender(currentUserId)}
                lenderLabel={youLabel}
                borrowerLabel={friendName}
                lenderAvatarUrl={members.find((m) => m.id === currentUserId)?.avatar_url}
                borrowerAvatarUrl={friend?.avatar_url}
                ariaLabel={t("expenses.loanYouLentTo", { name: friendName })}
              />
              <LoanDirectionOption
                selected={!lenderIsCurrentUser}
                onSelect={() => setLender(friendId)}
                lenderLabel={friendName}
                borrowerLabel={youLabel}
                lenderAvatarUrl={friend?.avatar_url}
                borrowerAvatarUrl={members.find((m) => m.id === currentUserId)?.avatar_url}
                ariaLabel={t("expenses.loanTheyLentToYou", { name: friendName })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface LoanDirectionOptionProps {
  selected: boolean;
  onSelect: () => void;
  lenderLabel: string;
  borrowerLabel: string;
  lenderAvatarUrl?: string | null;
  borrowerAvatarUrl?: string | null;
  ariaLabel: string;
}

const LoanDirectionOption: React.FC<LoanDirectionOptionProps> = ({
  selected,
  onSelect,
  lenderLabel,
  borrowerLabel,
  lenderAvatarUrl,
  borrowerAvatarUrl,
  ariaLabel,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={() => { tap(); onSelect(); }}
      className={cn(
        "rounded-xl border-2 px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-amber-500 bg-amber-100/70 dark:bg-amber-900/40 shadow-sm"
          : "border-border/70 bg-background/70 hover:border-amber-300/70 hover:bg-amber-50/40 dark:hover:bg-amber-950/20",
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <Avatar className="h-8 w-8 border border-amber-300/80">
            <AvatarImage src={lenderAvatarUrl || undefined} alt={lenderLabel} />
            <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {initialsFor(lenderLabel)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-medium truncate max-w-full">{lenderLabel}</span>
          <span className="text-[9px] uppercase tracking-wide text-amber-700/80 dark:text-amber-300/80">
            {t("expenses.lender")}
          </span>
        </div>

        <ArrowRightIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />

        <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
          <Avatar className="h-8 w-8 border border-amber-300/80">
            <AvatarImage src={borrowerAvatarUrl || undefined} alt={borrowerLabel} />
            <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {initialsFor(borrowerLabel)}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px] font-medium truncate max-w-full">{borrowerLabel}</span>
          <span className="text-[9px] uppercase tracking-wide text-amber-700/80 dark:text-amber-300/80">
            {t("expenses.borrower")}
          </span>
        </div>
      </div>
    </button>
  );
};
