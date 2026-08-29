import React from "react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/use-haptics";
import type { Control } from "react-hook-form";
import type { ExpenseFormSchema } from "../expense-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDownIcon,
  RepeatIcon,
  MessageSquareIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { AttachmentUpload, type AttachmentFile } from "../attachment-upload";
import { MarkdownEditor } from "../markdown-editor";
import { RecurringExpenseForm } from "../recurring-expense-form";
import { QuickDatePicker } from "../quick-date-picker";
import { loanModeIcon } from "@/assets/expense-friend";

interface Member {
  id: string;
  full_name: string;
}

interface FriendMoreOptionsProps {
  control: Control<ExpenseFormSchema>;
  members: Member[];
  currentUserId: string;
  isLoan: boolean;
  isRecurring: boolean;
  splitMethod: "equal" | "exact" | "percentage";
  // Advanced section state
  showAdvanced: boolean;
  onShowAdvancedChange: (v: boolean) => void;
  showComment: boolean;
  onShowCommentChange: (v: boolean) => void;
  // Attachments
  attachments: AttachmentFile[];
  onAttachmentsChange?: (files: AttachmentFile[]) => void;
}

export const FriendMoreOptions: React.FC<FriendMoreOptionsProps> = ({
  control,
  members,
  currentUserId,
  isLoan,
  isRecurring,
  splitMethod,
  showAdvanced,
  onShowAdvancedChange,
  showComment,
  onShowCommentChange,
  attachments,
  onAttachmentsChange,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();

  const splitLabels: Record<string, string> = {
    equal: t("expenses.splitEqualShort"),
    exact: t("expenses.splitExactShort"),
    percentage: t("expenses.splitPercentShort"),
  };

  return (
    <Collapsible
      open={showAdvanced}
      onOpenChange={(v) => { tap(); onShowAdvancedChange(v); }}
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between h-auto py-3 px-4 hover:bg-accent rounded-xl border border-dashed border-border/60"
          aria-expanded={showAdvanced}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {isLoan && (
              <img src={loanModeIcon} alt="" aria-hidden="true" className="h-4 w-4 object-contain" />
            )}
            {t("expenses.moreOptions")}
            {isLoan && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-700 dark:text-amber-300">
                {t("expenses.loanToggle")}
              </Badge>
            )}
            {splitMethod !== "equal" && !isLoan && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {splitLabels[splitMethod]}
              </Badge>
            )}
          </span>
          <ChevronDownIcon
            className={cn("h-4 w-4 text-muted-foreground transition-transform", showAdvanced && "rotate-180")}
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-3">
        {/* Date + Paid by — compact row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={control}
            name="expense_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">{t("expenses.date")}</FormLabel>
                <FormControl>
                  <QuickDatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="paid_by_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  {isLoan ? t("expenses.lender") : t("expenses.paidBy")}
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full h-10 px-3 text-sm border border-input rounded-lg bg-background"
                    aria-label={isLoan ? t("expenses.lender") : t("expenses.paidBy")}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentUserId ? t("common.you") : m.full_name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Split method — hidden in loan mode (always 100% to borrower) */}
        {!isLoan && (
        <FormField
          control={control}
          name="split_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">{t("expenses.splitMethod")}</FormLabel>
              <FormControl>
                <div
                  role="radiogroup"
                  aria-label={t("expenses.splitMethod")}
                  className="flex gap-2"
                >
                  {(["equal", "exact", "percentage"] as const).map((method) => (
                    <label
                      key={method}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border-2 text-sm font-medium cursor-pointer transition-colors",
                        field.value === method
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-accent"
                      )}
                    >
                      <input
                        type="radio"
                        name="split_method"
                        className="sr-only"
                        value={method}
                        checked={field.value === method}
                        onChange={() => { tap(); field.onChange(method); }}
                        aria-label={splitLabels[method]}
                      />
                      {field.value === method && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                      {splitLabels[method]}
                    </label>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        )}

        {isLoan && (
          <p className="text-xs text-muted-foreground px-1">
            {t("expenses.loanDirectionHint")}
          </p>
        )}

        {/* Recurring */}
        <FormField
          control={control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="rounded-xl border border-border/60 px-4 py-3 space-y-0">
              <div className="flex items-center justify-between">
                <FormLabel className="flex items-center gap-2 text-sm">
                  <RepeatIcon className="h-4 w-4" aria-hidden="true" />
                  {t("expenses.recurringExpense")}
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => { tap(); field.onChange(v); }}
                    aria-label={t("expenses.recurringExpense")}
                  />
                </FormControl>
              </div>
              {isRecurring && (
                <div className="mt-3">
                  {/* RecurringExpenseForm accepts Control<any> internally */}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <RecurringExpenseForm control={control as unknown as Control<any, any, any>} isRecurring={isRecurring} />
                </div>
              )}
            </FormItem>
          )}
        />

        {/* Attachments */}
        <div className="rounded-xl border border-border/60 px-4 py-3 space-y-2">
          <div className="text-sm font-medium">
            {t("expenses.attachments")}
          </div>
          <AttachmentUpload
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange ?? (() => {})}
          />
        </div>

        {/* Comment */}
        <Collapsible
          open={showComment}
          onOpenChange={(v) => { tap(); onShowCommentChange(v); }}
        >
          <div className="rounded-xl border border-border/60 px-4 py-3">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between h-auto p-0 hover:bg-transparent"
                aria-expanded={showComment}
              >
                <div className="flex items-center gap-2">
                  <MessageSquareIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    {t("expenses.addComment")}
                  </span>
                </div>
                <ChevronDownIcon
                  className={cn("h-4 w-4 transition-transform", showComment && "rotate-180")}
                  aria-hidden="true"
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <FormField
                control={control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <MarkdownEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder={t("expenses.commentPlaceholder")}
                        minHeight="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  );
};
