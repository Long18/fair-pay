import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MemberCombobox } from "@/components/ui/member-combobox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ExpenseFormValues } from "../types";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "../lib/categories";
import { useSplitCalculation } from "../hooks/use-split-calculation";
import { formatNumber } from "@/lib/locale-utils";
import { RecurringExpenseForm } from "./recurring-expense-form";
import { DEFAULT_RECURRING_VALUES } from "../types/recurring";

import { RepeatIcon, PercentIcon, DollarSignIcon, UserPlusIcon, UserMinusIcon, XIcon, CalendarIcon } from "@/components/ui/icons";
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string(),
  category: z.string().optional(),
  expense_date: z.string(),
  paid_by_user_id: z.string().uuid("Please select who paid"),
  split_method: z.enum(["equal", "exact", "percentage"]),
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
}

export const ExpenseForm = ({
  groupId,
  members,
  currentUserId,
  onSubmit,
  defaultValues,
  isLoading,
  topPartnerIds = [],
}: ExpenseFormProps) => {
  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: defaultValues?.description || "",
      amount: defaultValues?.amount || 0,
      currency: defaultValues?.currency || "VND",
      category: defaultValues?.category || "",
      expense_date: defaultValues?.expense_date || new Date().toISOString().split("T")[0],
      paid_by_user_id: defaultValues?.paid_by_user_id || currentUserId,
      split_method: defaultValues?.split_method || "equal",
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
  } = useSplitCalculation();

  const [manualSplits, setManualSplits] = useState<Record<string, number>>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const amount = form.watch("amount");
  const splitMethod = form.watch("split_method");

  useEffect(() => {
    if (members.length > 0 && participants.length === 0) {
      const defaultParticipants = [currentUserId, ...topPartnerIds.slice(0, 2)];
      const uniqueParticipants = Array.from(new Set(defaultParticipants));
      uniqueParticipants.forEach((memberId) => {
        if (members.some(m => m.id === memberId)) {
          addParticipant(memberId);
        }
      });
    }
  }, [members, participants.length, addParticipant, currentUserId, topPartnerIds]);

  useEffect(() => {
    if (amount > 0 && participants.length > 0) {
      recalculate(amount, splitMethod);
    }
  }, [amount, splitMethod, participants.length, recalculate]);

  const handleSplitValueChange = (userId: string, value: number) => {
    setManualSplits(prev => ({ ...prev, [userId]: value }));
    setSplitValue(userId, value);
    if (amount > 0) {
      recalculate(amount, splitMethod);
    }
  };

  const handleToggleParticipant = (userId: string, checked: boolean) => {
    if (checked) {
      addParticipant(userId);
      // Reset manual split value when adding
      setManualSplits(prev => {
        const newSplits = { ...prev };
        delete newSplits[userId];
        return newSplits;
      });
    } else {
      // Don't allow removing if only one participant left
      if (participants.length <= 1) return;
      removeParticipant(userId);
      setManualSplits(prev => {
        const newSplits = { ...prev };
        delete newSplits[userId];
        return newSplits;
      });
    }
  };

  const handleAddParticipant = (userId: string) => {
    addParticipant(userId);
    setManualSplits(prev => {
      const newSplits = { ...prev };
      delete newSplits[userId];
      return newSplits;
    });
  };

  const handleRemoveParticipant = (userId: string) => {
    if (userId === currentUserId || participants.length <= 1) return;
    removeParticipant(userId);
    setManualSplits(prev => {
      const newSplits = { ...prev };
      delete newSplits[userId];
      return newSplits;
    });
  };

  const availableMembers = members.filter(
    m => !participants.some(p => p.user_id === m.id)
  );

  const isParticipating = (userId: string) => {
    return participants.some(p => p.user_id === userId);
  };

  const handleFormSubmit = (data: ExpenseFormSchema) => {
    const formValues: ExpenseFormValues = {
      ...data,
      context_type: "group" as const,
      group_id: groupId,
      splits: participants,
    };
    onSubmit(formValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Dinner at restaurant" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="VND" value="VND">₫ VND</SelectItem>
                    <SelectItem key="USD" value="USD">$ USD</SelectItem>
                    <SelectItem key="EUR" value="EUR">€ EUR</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {field.value && (() => {
                        const meta = getCategoryMeta(field.value);
                        const Icon = meta.icon;
                        return (
                          <div className="flex items-center gap-2">
                            <div className={cn("rounded-md p-1 flex items-center justify-center", meta.bgColor)}>
                              <Icon className={cn("h-4 w-4", meta.color)} />
                            </div>
                            <span>{meta.name}</span>
                          </div>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const meta = getCategoryMeta(cat);
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <div className={cn("rounded-md p-1 flex items-center justify-center", meta.bgColor)}>
                            <Icon className={cn("h-4 w-4", meta.color)} />
                          </div>
                          <span>{meta.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => {
            // Parse date string correctly to avoid timezone issues
            const parseDate = (dateString: string | undefined) => {
              if (!dateString) return undefined;
              const [year, month, day] = dateString.split('-').map(Number);
              return new Date(year, month - 1, day);
            };

            return (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(parseDate(field.value)!, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0 z-[9999]" align="start">
                    <Calendar
                      mode="single"
                      selected={parseDate(field.value)}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          field.onChange(`${year}-${month}-${day}`);
                        }
                        setDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="paid_by_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid by</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Who paid?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {`${member.full_name}${member.id === currentUserId ? ' (You)' : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="split_method"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Split method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col space-y-2"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <RadioGroupItem value="equal" />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Split Equally
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Divide evenly among all members
                      </p>
                    </div>
                  </FormItem>

                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <RadioGroupItem value="exact" />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Enter Exact Amounts
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Specify exact amount for each person
                      </p>
                    </div>
                  </FormItem>

                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <RadioGroupItem value="percentage" />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="text-sm font-medium cursor-pointer">
                        Split by Percentage
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Assign percentage to each person
                      </p>
                    </div>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Split Configuration with Accordion */}
        <Card className="border-2">
          <Accordion type="single" collapsible defaultValue="participants">
            <AccordionItem value="participants" className="border-none">
              <CardHeader className="pb-3">
                <AccordionTrigger className="hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center justify-between flex-1 pr-3">
                    <div>
                      <CardTitle className="text-base text-left">Split Configuration</CardTitle>
                      <CardDescription className="text-left">
                        {splitMethod === "equal" && "Amount will be divided equally among selected members"}
                        {splitMethod === "exact" && "Enter the exact amount each person should pay"}
                        {splitMethod === "percentage" && "Enter percentage for each person (total should be 100%)"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {participants.length} selected
                    </Badge>
                  </div>
                </AccordionTrigger>
              </CardHeader>

              <AccordionContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Add Participant Combobox - Always show, even if no available members */}
                  <div className="space-y-2">
                    {availableMembers.length > 0 ? (
                      <MemberCombobox
                        members={availableMembers}
                        selectedIds={participants.map(p => p.user_id)}
                        onSelect={handleAddParticipant}
                        placeholder="Add more participants..."
                        emptyMessage="No more members available"
                        currentUserId={currentUserId}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-2 bg-muted/50 rounded-md">
                        All members are already selected
                      </div>
                    )}
                  </div>

                  {participants.length > 0 && (
                    <>
                      <Separator />

                      {/* Selected Participants as Chips */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Selected Participants</h4>
                          <span className="text-xs text-muted-foreground">
                            {participants.length} {participants.length === 1 ? "person" : "people"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {participants.map((participant) => {
                            const member = members.find(m => m.id === participant.user_id);
                            if (!member) return null;
                            const isCurrentUser = member.id === currentUserId;

                            return (
                              <Button
                                key={participant.user_id}
                                variant="secondary"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => handleRemoveParticipant(participant.user_id)}
                                disabled={isCurrentUser || participants.length <= 1}
                              >
                                {member.full_name}
                                {isCurrentUser && <Badge variant="outline" className="ml-1 text-xs px-1 py-0">You</Badge>}
                                {!isCurrentUser && participants.length > 1 && (
                                  <XIcon className="h-3 w-3" />
                                )}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Split Amount Inputs (for exact/percentage methods) */}
                  {participants.length > 0 && (splitMethod === "exact" || splitMethod === "percentage") && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">
                          {splitMethod === "exact" ? "Enter Exact Amounts" : "Enter Percentages"}
                        </h4>
                        {participants.map((participant) => {
                          const member = members.find(m => m.id === participant.user_id);
                          if (!member) return null;

                          return (
                            <div key={participant.user_id} className="flex items-center gap-3">
                              <span className="w-32 text-sm truncate">{member.full_name}</span>
                              <div className="relative flex-1">
                                <Input
                                  type="number"
                                  step={splitMethod === "exact" ? "0.01" : "1"}
                                  min="0"
                                  max={splitMethod === "percentage" ? "100" : undefined}
                                  placeholder={splitMethod === "exact" ? "0.00" : "0"}
                                  value={manualSplits[participant.user_id] || ""}
                                  onChange={(e) => handleSplitValueChange(participant.user_id, parseFloat(e.target.value) || 0)}
                                  className="pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  {splitMethod === "percentage" ? "%" : "₫"}
                                </span>
                              </div>
                              <span className="w-24 text-right text-sm font-medium">
                                = {formatNumber(participant.computed_amount)} ₫
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Equal Split Preview */}
                  {participants.length > 0 && splitMethod === "equal" && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Split Preview</h4>
                        <div className="space-y-1">
                          {participants.map((participant) => {
                            const member = members.find(m => m.id === participant.user_id);
                            if (!member) return null;

                            return (
                              <div key={participant.user_id} className="flex items-center justify-between text-sm py-1">
                                <span className="text-muted-foreground">{member.full_name}</span>
                                <span className="font-medium">{formatNumber(participant.computed_amount)} ₫</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Helper text for empty selection */}
                  {participants.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlusIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium mb-1">No participants selected</p>
                      <p className="text-xs">Use the search above to add people to split with</p>
                    </div>
                  )}

                  <Separator />

                  {/* Total Summary */}
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-bold">Total</span>
                    <span className={cn(
                      "font-bold text-lg",
                      Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" ? "text-destructive" : "text-primary"
                    )}>
                      {formatNumber(totalSplit)} ₫
                    </span>
                  </div>

                  {/* Validation Messages */}
                  {Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && (
                    <p className="text-sm text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded">
                      <span>⚠️</span>
                      <span>Total ({formatNumber(totalSplit)} ₫) doesn't match expense amount ({formatNumber(amount)} ₫)</span>
                    </p>
                  )}

                  {splitMethod === "percentage" && participants.length > 0 && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>💡</span>
                      <span>Total percentage: {participants.reduce((sum, p) => sum + (manualSplits[p.user_id] || 0), 0)}%</span>
                    </p>
                  )}
                </CardContent>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Recurring Expense Toggle */}
        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <RepeatIcon className="h-4 w-4" />
                  Chi phí định kỳ
                </FormLabel>
                <FormDescription>
                  Tự động tạo chi phí này theo lịch (hàng tuần, tháng, ...)
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

        {/* Recurring Expense Configuration */}
        <RecurringExpenseForm
          control={form.control}
          isRecurring={form.watch("is_recurring") || false}
        />

        <Button type="submit" disabled={isLoading || !isSplitValid} className="w-full">
          {isLoading ? "Creating..." : "Create Expense"}
        </Button>
      </form>
    </Form>
  );
};
