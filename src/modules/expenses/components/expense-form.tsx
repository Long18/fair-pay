import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useHaptics } from "@/hooks/use-haptics";
import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { getOweStatusColors } from "@/lib/status-colors";
import { ExpenseFormValues } from "../types";
import { useSplitCalculation } from "../hooks/use-split-calculation";
import { RecurringExpenseForm } from "./recurring-expense-form";
import { DEFAULT_RECURRING_VALUES } from "../types/recurring";
import { AttachmentUpload, type AttachmentFile } from "./attachment-upload";
import {
  RepeatIcon,
  UsersIcon,
  MessageSquareIcon,
  ChevronDownIcon,
  CheckIcon,
  HandCoinsIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";

// Import new components
import { CategoryGrid } from "./category-grid";
import { AmountInput, type AmountExpressionState } from "./amount-input";
import { QuickDatePicker } from "./quick-date-picker";
import { ParticipantChips } from "./participant-chips";
import { QuickTemplates } from "./quick-templates";
import { MarkdownEditor } from "./markdown-editor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string(),
  category: z.string().optional(),
  expense_date: z.string(),
  paid_by_user_id: z.string().uuid("Please select who paid"),
  split_method: z.enum(["equal", "exact", "percentage"]),
  comment: z.string().max(1000, "Comment is too long").optional(),
  is_loan: z.boolean(),
  is_recurring: z.boolean(),
  recurring: z.object({
    frequency: z.enum(["weekly", "bi_weekly", "monthly", "quarterly", "yearly", "custom"]),
    interval: z.number().min(1),
    start_date: z.date(),
    end_date: z.date().nullable(),
    notify_before_days: z.number().min(0),
  }).optional(),
});

type ExpenseFormSchema = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  groupId?: string;
  members: Array<{ id: string; full_name: string; avatar_url?: string | null }>;
  currentUserId: string;
  onSubmit: (values: ExpenseFormValues) => void;
  defaultValues?: Partial<ExpenseFormValues>;
  isLoading?: boolean;
  topPartnerIds?: string[];
  isEdit?: boolean;
  attachments?: AttachmentFile[];
  onAttachmentsChange?: (attachments: AttachmentFile[]) => void;
}

export const ExpenseForm = ({
  groupId,
  members,
  currentUserId,
  onSubmit,
  defaultValues,
  isLoading,
  isEdit = false,
  attachments = [],
  onAttachmentsChange,
}: ExpenseFormProps) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: defaultValues?.description || "",
      amount: defaultValues?.amount,
      currency: defaultValues?.currency || "VND",
      category: defaultValues?.category || "",
      expense_date: defaultValues?.expense_date || new Date().toISOString().split("T")[0],
      paid_by_user_id: defaultValues?.paid_by_user_id || currentUserId,
      split_method: defaultValues?.split_method || "equal",
      comment: defaultValues?.comment || "",
      is_loan: defaultValues?.is_loan || false,
      is_recurring: false,
      recurring: DEFAULT_RECURRING_VALUES,
    },
  });

  const isFriendContext = groupId === undefined;

  const {
    participants,
    addParticipant,
    addParticipantByEmail,
    removeParticipant,
    setSplitValue,
    recalculate,
    isValid: isSplitValid,
    totalSplit,
  } = useSplitCalculation(defaultValues?.splits);

  const [showAdvanced, setShowAdvanced] = useState(!!defaultValues?.comment || (attachments && attachments.length > 0));
  const [showComment, setShowComment] = useState(!!defaultValues?.comment);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [amountExpressionState, setAmountExpressionState] = useState<AmountExpressionState>({
    rawValue: defaultValues?.amount !== undefined ? String(defaultValues.amount) : "",
    status: defaultValues?.amount !== undefined ? "valid" : "empty",
    value: defaultValues?.amount,
  });
  const [hasBlockingExactSplitExpressions, setHasBlockingExactSplitExpressions] = useState(false);
  const didAutoSelectRef = useRef(false);

  const amount = form.watch("amount");
  const splitMethod = form.watch("split_method");
  const currency = form.watch("currency");
  const isRecurring = form.watch("is_recurring");
  const isLoan = form.watch("is_loan");
  const paidByUserId = form.watch("paid_by_user_id");
  const owedStatusColors = getOweStatusColors("owed");
  const participantIdentitySignature = useMemo(
    () => participants.map((participant) => participant.user_id || participant.pending_email || "").join("|"),
    [participants]
  );

  // Auto-select participants
  useEffect(() => {
    if (!didAutoSelectRef.current && members.length > 0 && participants.length === 0 && !defaultValues?.splits) {
      // Friend context: auto-select both parties
      if (groupId === undefined && members.length === 2) {
        members.forEach(m => {
          if (m.id) addParticipant(m.id);
        });
      }
      // Group context: auto-select all group members
      if (groupId !== undefined) {
        members.forEach(m => {
          if (m.id) addParticipant(m.id);
        });
      }
      didAutoSelectRef.current = true;
    }
  }, [members, participants.length, defaultValues?.splits, groupId, currentUserId, addParticipant]);

  // Recalculate splits when amount or method changes
  useEffect(() => {
    if (amount && amount > 0 && participants.length > 0) {
      if (isLoan && isFriendContext) {
        // Loan mode: 100% goes to borrower (non-payer)
        // We handle this by setting exact amounts
        participantIdentitySignature
          .split("|")
          .filter(Boolean)
          .forEach((key) => {
          if (key === paidByUserId) {
            setSplitValue(key, 0);
          } else {
            setSplitValue(key, amount);
          }
          });
        recalculate(amount, 'exact');
      } else {
        recalculate(amount, splitMethod);
      }
    }
  }, [amount, splitMethod, participants.length, participantIdentitySignature, recalculate, isLoan, isFriendContext, paidByUserId, setSplitValue]);

  const handleFormSubmit = (data: ExpenseFormSchema) => {
    if (amountExpressionState.status !== "valid" || (amountExpressionState.value ?? 0) <= 0) {
      return;
    }

    if (hasBlockingExactSplitExpressions) {
      return;
    }

    const validSplits = participants.filter(p => {
      // Either user_id or pending_email must be present
      if (!p.user_id && !p.pending_email) return false;
      if (p.computed_amount === undefined || p.computed_amount === null || isNaN(p.computed_amount)) {
        return false;
      }
      return true;
    });

    if (validSplits.length === 0) {
      console.error('[ExpenseForm] No valid splits to submit');
      return;
    }

    const formValues: ExpenseFormValues = {
      ...data,
      context_type: groupId ? "group" : "friend",
      group_id: groupId,
      is_loan: isLoan && isFriendContext ? true : false,
      splits: validSplits,
    };
    onSubmit(formValues);
  };

  const handleTemplateSelect = (template: {
    description: string;
    category: string;
    amount?: number;
  }) => {
    form.setValue("description", template.description);
    form.setValue("category", template.category);
    if (template.amount) {
      form.setValue("amount", template.amount);
    }
    setSelectedTemplate(template.description);
  };

  const availableMembers = useMemo(() => {
    return members.filter(m => !participants.some(p => p.user_id === m.id));
  }, [members, participants]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 overflow-x-hidden max-w-full">
        {/* Quick Templates */}
        <QuickTemplates
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
        />

        {/* Basic Info Card */}
        <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Expense Details</CardTitle>
            <CardDescription>What did you pay for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-hidden">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Lunch at restaurant"
                      {...field}
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Currency in same row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-1 sm:col-span-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <AmountInput
                          value={field.value}
                          onChange={field.onChange}
                          onExpressionStateChange={setAmountExpressionState}
                          currency={currency}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-11 px-3 border border-input rounded-lg bg-background"
                      >
                        <option value="VND">VND</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Paid By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expense_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <QuickDatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paid_by_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid by</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-11 px-3 border border-input rounded-lg bg-background"
                      >
                        <option value="">Select...</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}{member.id === currentUserId ? ' (You)' : ''}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategoryGrid
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Loan Toggle - Friend context only */}
        {isFriendContext && members.length === 2 && (
          <Card className={cn(
            "border-2 shadow-sm overflow-hidden transition-colors",
            isLoan ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20" : "border-border/50"
          )}>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="is_loan"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <HandCoinsIcon className="h-4 w-4" />
                        {t('expenses.loanToggle')}
                      </FormLabel>
                      <FormDescription>
                        {t('expenses.loanToggleDescription')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(v) => { tap(); field.onChange(v); }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Loan Summary - shows who borrows from whom */}
              {isLoan && amount && amount > 0 && paidByUserId && (
                <div className="mt-4 p-4 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-3">
                    {/* Borrower */}
                    <div className="flex flex-col items-center gap-1">
                      <Avatar className="h-10 w-10 border-2 border-amber-300">
                        <AvatarImage
                          src={members.find(m => m.id !== paidByUserId)?.avatar_url || undefined}
                          alt={members.find(m => m.id !== paidByUserId)?.full_name}
                        />
                        <AvatarFallback className="text-xs bg-amber-200 dark:bg-amber-800">
                          {(members.find(m => m.id !== paidByUserId)?.full_name || "?")
                            .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                        {members.find(m => m.id !== paidByUserId)?.full_name || t('expenses.unknown')}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-300">
                        {t('expenses.borrower')}
                      </Badge>
                    </div>

                    {/* Arrow with amount */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        {formatNumber(amount)} {currency === "VND" ? "₫" : currency === "USD" ? "$" : "€"}
                      </span>
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <span className="text-xs">{t('expenses.borrowsFrom')}</span>
                        <ArrowRightIcon className="h-4 w-4" />
                      </div>
                    </div>

                    {/* Lender */}
                    <div className="flex flex-col items-center gap-1">
                      <Avatar className={cn("h-10 w-10 border-2", owedStatusColors.border)}>
                        <AvatarImage
                          src={members.find(m => m.id === paidByUserId)?.avatar_url || undefined}
                          alt={members.find(m => m.id === paidByUserId)?.full_name}
                        />
                        <AvatarFallback className={cn("text-xs", owedStatusColors.bg, owedStatusColors.text)}>
                          {(members.find(m => m.id === paidByUserId)?.full_name || "?")
                            .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("text-xs font-medium", owedStatusColors.text)}>
                        {members.find(m => m.id === paidByUserId)?.full_name || t('expenses.unknown')}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", owedStatusColors.border, owedStatusColors.text)}>
                        {t('expenses.lender')}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Split Configuration Card - Hidden when loan mode is active */}
        {!(isLoan && isFriendContext) && (
        <Card className="border-2 border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Split Between
            </CardTitle>
            <CardDescription>
              Select who shares this expense
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-hidden">
            {/* Split Method */}
            <FormField
              control={form.control}
              name="split_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How to split?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(v) => { tap(); field.onChange(v); }}
                      value={field.value}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    >
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="equal" id="equal" className="peer sr-only" />
                        </FormControl>
                        <label
                          htmlFor="equal"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <span className="text-sm font-medium">Equally</span>
                          <span className="text-xs text-muted-foreground">Split even</span>
                        </label>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="exact" id="exact" className="peer sr-only" />
                        </FormControl>
                        <label
                          htmlFor="exact"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <span className="text-sm font-medium">Exact</span>
                          <span className="text-xs text-muted-foreground">Set amounts</span>
                        </label>
                      </FormItem>
                      <FormItem>
                        <FormControl>
                          <RadioGroupItem value="percentage" id="percentage" className="peer sr-only" />
                        </FormControl>
                        <label
                          htmlFor="percentage"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <span className="text-sm font-medium">Percent</span>
                          <span className="text-xs text-muted-foreground">By %</span>
                        </label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Participants Selection */}
            <ParticipantChips
              members={members}
              participants={participants}
              availableMembers={availableMembers}
              currentUserId={currentUserId}
              splitMethod={splitMethod}
              amount={amount}
              currency={currency}
              onAddParticipant={addParticipant}
              onAddParticipantByEmail={addParticipantByEmail}
              onRemoveParticipant={removeParticipant}
              onSplitValueChange={setSplitValue}
              onExpressionStateChange={setHasBlockingExactSplitExpressions}
              totalSplit={totalSplit}
            />
          </CardContent>
        </Card>
        )}

        {/* Advanced Options - Collapsible */}
        <Collapsible open={showAdvanced} onOpenChange={(open) => { tap(); setShowAdvanced(open); }}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between h-auto py-3 px-4 hover:bg-accent"
            >
              <span className="text-sm font-medium">Advanced Options</span>
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvanced && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Recurring Expense */}
            <Card className="border border-border/50">
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <RepeatIcon className="h-4 w-4" />
                          Recurring Expense
                        </FormLabel>
                        <FormDescription>
                          Automatically create this expense periodically
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(v) => { tap(); field.onChange(v); }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {isRecurring && (
                  <div className="mt-4">
                    <RecurringExpenseForm
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      control={form.control as unknown as import('react-hook-form').Control<any, any, any>}
                      isRecurring={isRecurring}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card className="border border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">Attachments</label>
                  <AttachmentUpload
                    attachments={attachments}
                    onAttachmentsChange={onAttachmentsChange || (() => {})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Comment - Simple expandable */}
            <Card className="border border-border/50">
              <CardContent className="pt-6">
                <Collapsible open={showComment} onOpenChange={(open) => { tap(); setShowComment(open); }}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between h-auto p-0 hover:bg-transparent"
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquareIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">Add Comment</span>
                      </div>
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 transition-transform",
                          showComment && "rotate-180"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Add any notes or details about this expense..."
                              minHeight="min-h-[120px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full h-12 font-medium text-base"
          disabled={
            isLoading ||
            !isSplitValid ||
            amountExpressionState.status !== "valid" ||
            (amountExpressionState.value ?? 0) <= 0 ||
            hasBlockingExactSplitExpressions
          }
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5 mr-2" />
              {isEdit ? 'Update Expense' : 'Create Expense'}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};
