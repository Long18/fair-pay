import React, { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AmountInput, type AmountExpressionState } from "../amount-input";
import type { AttachmentFile } from "../attachment-upload";
import type { ExpenseFormSchema } from "../expense-form";
import {
  amountHeroBg,
  receiptCoinSticker,
  waitingCoinSticker,
} from "@/assets/expense-friend";
import { FriendSplitPreview } from "./friend-split-preview";
import { FriendQuickPicks } from "./friend-quick-picks";
import { FriendMoreOptions } from "./friend-more-options";
import { OutcomeSubmitButton } from "./outcome-submit-button";

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

interface FriendExpenseLayoutProps {
  members: Member[];
  currentUserId: string;
  // Split state
  participants: Participant[];
  isSplitValid: boolean;
  totalSplit: number;
  // Amount expression
  amountExpressionState: AmountExpressionState;
  setAmountExpressionState: (state: AmountExpressionState) => void;
  hasBlockingExactSplitExpressions: boolean;
  // Template selection
  selectedTemplate: string | null;
  handleTemplateSelect: (t: { description: string; category: string; amount?: number }) => void;
  // UI state
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  showComment: boolean;
  setShowComment: (v: boolean) => void;
  // Attachments
  attachments: AttachmentFile[];
  onAttachmentsChange?: (files: AttachmentFile[]) => void;
  // Form meta
  isLoading?: boolean;
  isEdit?: boolean;
}

export const FriendExpenseLayout: React.FC<FriendExpenseLayoutProps> = ({
  members,
  currentUserId,
  participants,
  isSplitValid,
  amountExpressionState,
  setAmountExpressionState,
  hasBlockingExactSplitExpressions,
  selectedTemplate,
  handleTemplateSelect,
  showAdvanced,
  setShowAdvanced,
  showComment,
  setShowComment,
  attachments,
  onAttachmentsChange,
  isLoading,
  isEdit,
}) => {
  const { t } = useTranslation();
  const { control, watch } = useFormContext<ExpenseFormSchema>();

  const amount = watch("amount");
  const currency = watch("currency");
  const splitMethod = watch("split_method");
  const isLoan = watch("is_loan");
  const isRecurring = watch("is_recurring");
  const paidByUserId = watch("paid_by_user_id");

  const friend = members.find((m) => m.id !== currentUserId);
  const friendName = friend?.full_name ?? t("expenses.friend", { defaultValue: "Friend" });
  const payerIsCurrentUser = paidByUserId === currentUserId;

  const debtor = members.find((m) => m.id !== paidByUserId);
  const debtorOwes = useMemo(() => {
    if (!amount || amount <= 0 || !debtor) return 0;
    if (isLoan) return amount;
    const debtorPart = participants.find((p) => p.user_id === debtor.id);
    return Math.max(0, debtorPart?.computed_amount ?? amount / 2);
  }, [amount, debtor, isLoan, participants]);

  const amountIsValid =
    amountExpressionState.status === "valid" &&
    (amountExpressionState.value ?? 0) > 0;

  const isSubmitDisabled =
    !isSplitValid ||
    !amountIsValid ||
    hasBlockingExactSplitExpressions;

  const subtitleText = payerIsCurrentUser
    ? t("expenses.friendSubtitleYouPaid", {
        defaultValue: "You paid · split with {{name}}",
        name: friendName,
      })
    : t("expenses.friendSubtitleTheyPaid", {
        defaultValue: "{{name}} paid · split between you",
        name: friendName,
      });

  return (
    <div className="space-y-4 overflow-x-hidden max-w-full">
      {/* Context subtitle */}
      <p className="text-center text-xs text-muted-foreground px-2 truncate" aria-label={subtitleText}>
        {subtitleText}
      </p>

      {/* Amount hero */}
      <div
        className="relative rounded-2xl overflow-hidden border border-border/40 shadow-sm"
        style={{
          backgroundImage: `url(${amountHeroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Legibility overlay */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" aria-hidden="true" />

        {/* Decorative sticker */}
        <img
          src={amountIsValid ? receiptCoinSticker : waitingCoinSticker}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 h-20 w-20 object-contain pointer-events-none select-none transition-opacity duration-300",
            amountIsValid ? "opacity-90" : "opacity-40"
          )}
        />

        <div className="relative z-10 p-4 space-y-3 pr-24">
          {/* Amount label */}
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("expenses.totalAmount", { defaultValue: "Total amount" })}
          </p>

          {/* Amount + currency row */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <FormField
                control={control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AmountInput
                        value={field.value}
                        onChange={field.onChange}
                        onExpressionStateChange={setAmountExpressionState}
                        currency={currency}
                        placeholder="0"
                        className="h-14 text-3xl font-bold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 tabular-nums"
                        aria-label={t("expenses.amount", { defaultValue: "Amount" })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="currency"
              render={({ field }) => (
                <FormItem className="shrink-0 mb-1">
                  <FormControl>
                    <select
                      {...field}
                      className="h-9 px-2 text-sm font-semibold border border-input/60 rounded-lg bg-background/70 text-muted-foreground cursor-pointer"
                      aria-label={t("expenses.currency", { defaultValue: "Currency" })}
                    >
                      <option value="VND">VND</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">{t("expenses.description", { defaultValue: "Description" })}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={t("expenses.descriptionPlaceholder", {
                  defaultValue: "e.g. Coffee at Highlands",
                })}
                className="h-11"
                aria-label={t("expenses.description", { defaultValue: "Description" })}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quick picks */}
      <FriendQuickPicks
        selected={selectedTemplate}
        onSelect={handleTemplateSelect}
        onMore={() => setShowAdvanced(true)}
      />

      {/* Two-person split preview */}
      <FriendSplitPreview
        members={members}
        currentUserId={currentUserId}
        paidByUserId={paidByUserId}
        amount={amount}
        currency={currency}
        splitMethod={splitMethod}
        isLoan={isLoan}
        participants={participants}
      />

      {/* More options (collapsible) */}
      <FriendMoreOptions
        control={control}
        members={members}
        currentUserId={currentUserId}
        isLoan={isLoan}
        isRecurring={isRecurring}
        splitMethod={splitMethod}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={setShowAdvanced}
        showComment={showComment}
        onShowCommentChange={setShowComment}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
      />

      {/* Outcome-aware submit */}
      <OutcomeSubmitButton
        isLoading={isLoading}
        isEdit={isEdit}
        disabled={isSubmitDisabled}
        debtorOwes={debtorOwes}
        debtorName={debtor?.full_name}
        currency={currency}
        payerIsCurrentUser={payerIsCurrentUser}
        hasAmount={amountExpressionState.status !== "empty"}
        amountIsValid={amountIsValid}
        isSplitValid={isSplitValid}
      />
    </div>
  );
};
