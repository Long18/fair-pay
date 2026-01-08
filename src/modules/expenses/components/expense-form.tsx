import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useEffect, useState, useMemo } from "react";
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
import { cn } from "@/lib/utils";
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
} from "@/components/ui/icons";

// Import new components
import { CategoryGrid } from "./category-grid";
import { AmountInput } from "./amount-input";
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
  groupId: string;
  members: Array<{ id: string; full_name: string }>;
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
  topPartnerIds = [],
  isEdit = false,
  attachments = [],
  onAttachmentsChange,
}: ExpenseFormProps) => {
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
      is_recurring: false,
      recurring: DEFAULT_RECURRING_VALUES,
    },
  });

  const {
    participants,
    addParticipant,
    removeParticipant,
    setSplitValue,
    recalculate,
    isValid: isSplitValid,
    totalSplit,
  } = useSplitCalculation(defaultValues?.splits);

  const [showAdvanced, setShowAdvanced] = useState(!!defaultValues?.comment || (attachments && attachments.length > 0));
  const [showComment, setShowComment] = useState(!!defaultValues?.comment);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const amount = form.watch("amount");
  const splitMethod = form.watch("split_method");
  const currency = form.watch("currency");
  const isRecurring = form.watch("is_recurring");

  // Auto-select participants
  useEffect(() => {
    if (members.length > 0 && participants.length === 0 && !defaultValues?.splits) {
      if (members.length === 2 && groupId === undefined) {
        members.forEach(m => {
          if (m.id) addParticipant(m.id);
        });
      } else {
        const defaultParticipants = [currentUserId, ...topPartnerIds.slice(0, 2)]
          .filter(id => id !== undefined && id !== null);
        const uniqueParticipants = Array.from(new Set(defaultParticipants));
        uniqueParticipants.forEach((memberId) => {
          if (memberId && members.some(m => m.id === memberId)) {
            addParticipant(memberId);
          }
        });
      }
    }
  }, [members, participants.length, defaultValues?.splits, currentUserId, topPartnerIds, addParticipant, groupId]);

  // Recalculate splits when amount or method changes
  useEffect(() => {
    if (amount && amount > 0 && participants.length > 0) {
      recalculate(amount, splitMethod);
    }
  }, [amount, splitMethod, participants.length, recalculate]);

  const handleFormSubmit = (data: ExpenseFormSchema) => {
    const validSplits = participants.filter(p => {
      if (!p.user_id) return false;
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
      context_type: "group" as const,
      group_id: groupId,
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
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Quick Templates */}
        <QuickTemplates
          onSelectTemplate={handleTemplateSelect}
          selectedTemplate={selectedTemplate}
        />

        {/* Basic Info Card */}
        <Card className="border-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Expense Details</CardTitle>
            <CardDescription>What did you pay for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
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
            <div className="grid grid-cols-2 gap-3">
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

        {/* Split Configuration Card */}
        <Card className="border-2 border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Split Between
            </CardTitle>
            <CardDescription>
              Select who shares this expense
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Split Method */}
            <FormField
              control={form.control}
              name="split_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How to split?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-3 gap-3"
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
              onRemoveParticipant={removeParticipant}
              onSplitValueChange={setSplitValue}
              totalSplit={totalSplit}
            />
          </CardContent>
        </Card>

        {/* Advanced Options - Collapsible */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
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
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {isRecurring && (
                  <div className="mt-4">
                    <RecurringExpenseForm
                      control={form.control}
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
                <Collapsible open={showComment} onOpenChange={setShowComment}>
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
          disabled={isLoading || !isSplitValid}
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
