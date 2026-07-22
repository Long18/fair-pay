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
import { FriendExpenseLayout } from "./friend-expense/friend-expense-layout";
import { journeyTracking } from "@/lib/journey-tracking";
import type { ExpenseFormStepKey } from "./expense-form-stepper";
import { ExpenseFormStepper } from "./expense-form-stepper";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  amountHeroBg,
  receiptCoinSticker,
  waitingCoinSticker,
} from "@/assets/expense-friend";

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

export type ExpenseFormSchema = z.infer<typeof expenseSchema>;

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

const EMPTY_ATTACHMENTS: AttachmentFile[] = [];

export const ExpenseForm = ({
  groupId,
  members,
  currentUserId,
  onSubmit,
  defaultValues,
  isLoading,
  isEdit = false,
  attachments = EMPTY_ATTACHMENTS,
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
  const description = form.watch("description");
  const owedStatusColors = getOweStatusColors("owed");
  const participantIdentitySignature = useMemo(
    () => participants.map((participant) => participant.user_id || participant.pending_email || "").join("|"),
    [participants]
  );

  const activeFormStep = useMemo<ExpenseFormStepKey>(() => {
    if (participants.length > 0 && isSplitValid && amount) return "review";
    if (participants.length > 0) return "split";
    if (description && amount) return "participants";
    return "details";
  }, [participants.length, isSplitValid, amount, description]);

  const trackedFormStepRef = useRef<ExpenseFormStepKey | null>(null);
  useEffect(() => {
    if (isEdit) return;
    if (trackedFormStepRef.current === activeFormStep) return;
    trackedFormStepRef.current = activeFormStep;
    journeyTracking.trackFormView("expense-create", activeFormStep);
    if (activeFormStep === "participants" && participants.length > 0) {
      journeyTracking.trackEvent({
        event_name: "expense_participants_selected",
        event_category: "expense",
        page_path: window.location.pathname,
        flow_name: "expense-create",
        step_name: "participants",
        properties: { participant_count: participants.length },
      });
    }
  }, [activeFormStep, isEdit, participants.length]);

  const trackedSplitMethodRef = useRef<string | null>(null);
  useEffect(() => {
    if (isEdit || !splitMethod) return;
    if (trackedSplitMethodRef.current === splitMethod) return;
    trackedSplitMethodRef.current = splitMethod;
    journeyTracking.trackEvent({
      event_name: "expense_split_method_selected",
      event_category: "expense",
      page_path: window.location.pathname,
      flow_name: "expense-create",
      step_name: "split",
      properties: { split_method: splitMethod },
    });
  }, [splitMethod, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    journeyTracking.trackEvent({
      event_name: "expense_form_started",
      event_category: "expense",
      page_path: window.location.pathname,
      flow_name: "expense-create",
      step_name: "details",
    });
  }, [isEdit]);

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

  // Friend context: render dedicated outcome-first UI for two-person expenses
  if (isFriendContext && members.length === 2 && !isEdit) {
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-4 overflow-x-hidden max-w-full"
        >
          <FriendExpenseLayout
            members={members}
            currentUserId={currentUserId}
            participants={participants}
            isSplitValid={isSplitValid}
            totalSplit={totalSplit}
            amountExpressionState={amountExpressionState}
            setAmountExpressionState={setAmountExpressionState}
            hasBlockingExactSplitExpressions={hasBlockingExactSplitExpressions}
            selectedTemplate={selectedTemplate}
            handleTemplateSelect={handleTemplateSelect}
            showAdvanced={showAdvanced}
            setShowAdvanced={setShowAdvanced}
            showComment={showComment}
            setShowComment={setShowComment}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            isLoading={isLoading}
            isEdit={isEdit}
          />
        </form>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 overflow-x-hidden max-w-full">
        {!isEdit && <ExpenseFormStepper activeStep={activeFormStep} />}
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

            {/* Amount and Currency — hero card */}
            <div
              className="relative rounded-2xl overflow-hidden border border-border/40 shadow-sm"
              style={{
                backgroundImage: `url(${amountHeroBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" aria-hidden="true" />
              <img
                src={
                  amountExpressionState.status === "valid" && (amountExpressionState.value ?? 0) > 0
                    ? receiptCoinSticker
                    : waitingCoinSticker
                }
                alt=""
                aria-hidden="true"
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2 h-20 w-20 object-contain pointer-events-none select-none transition-opacity duration-300",
                  amountExpressionState.status === "valid" && (amountExpressionState.value ?? 0) > 0
                    ? "opacity-90"
                    : "opacity-40"
                )}
              />
              <div className="relative z-10 p-4 pr-24 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("expenses.totalAmount", { defaultValue: "Total amount" })}
                </p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    <FormField
                      control={form.control}
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
                    control={form.control}
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
                    <div
                      role="radiogroup"
                      aria-label="How to split?"
                      className="flex gap-2"
                    >
                      {(["equal", "exact", "percentage"] as const).map((method) => {
                        const splitLabels: Record<string, string> = {
                          equal: "Equally",
                          exact: "Exact",
                          percentage: "Percent",
                        };
                        return (
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
                              className="sr-only"
                              value={method}
                              checked={field.value === method}
                              onChange={() => { tap(); field.onChange(method); }}
                              aria-label={splitLabels[method]}
                            />
                            {field.value === method && <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                            {splitLabels[method]}
                          </label>
                        );
                      })}
                    </div>
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
                  <div className="text-sm font-medium">Attachments</div>
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
