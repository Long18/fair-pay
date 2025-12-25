import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useEffect } from "react";
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
import { CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ExpenseFormValues } from "../types";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "../lib/categories";
import { useSplitCalculation } from "../hooks/use-split-calculation";
import { formatNumber } from "@/lib/locale-utils";
import { RecurringExpenseForm } from "./recurring-expense-form";
import { DEFAULT_RECURRING_VALUES } from "../types/recurring";

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required").max(200),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("VND"),
  category: z.string().optional(),
  expense_date: z.string(),
  paid_by_user_id: z.string().uuid("Please select who paid"),
  split_method: z.enum(["equal", "exact", "percentage"]),
  is_recurring: z.boolean().default(false),
  recurring: z.object({
    frequency: z.enum(["weekly", "bi_weekly", "monthly", "quarterly", "yearly", "custom"]),
    interval: z.number().min(1),
    start_date: z.date(),
    end_date: z.date().nullable(),
    notify_before_days: z.number().min(0),
  }).optional(),
});

interface ExpenseFormProps {
  groupId: string;
  members: Array<{ id: string; full_name: string }>;
  currentUserId: string;
  onSubmit: (values: ExpenseFormValues) => void;
  defaultValues?: Partial<ExpenseFormValues>;
  isLoading?: boolean;
}

export const ExpenseForm = ({
  groupId,
  members,
  currentUserId,
  onSubmit,
  defaultValues,
  isLoading,
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
    recalculate,
    isValid: isSplitValid,
    totalSplit,
  } = useSplitCalculation();

  const amount = form.watch("amount");
  const splitMethod = form.watch("split_method");

  useEffect(() => {
    if (members.length > 0 && participants.length === 0) {
      members.forEach((member) => addParticipant(member.id));
    }
  }, [members, participants.length, addParticipant]);

  useEffect(() => {
    if (amount > 0 && participants.length > 0) {
      recalculate(amount, splitMethod);
    }
  }, [amount, splitMethod, participants.length, recalculate]);

  const handleFormSubmit = (data: any) => {
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="VND">₫ VND</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
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
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(date?.toISOString().split("T")[0])
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Who paid?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                      {member.id === currentUserId && " (You)"}
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
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="equal" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Split equally
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="exact" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Enter exact amounts
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="percentage" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Split by percentage
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Split Preview */}
        <div className="rounded-lg border p-4 space-y-2">
          <h4 className="font-medium text-sm">Split preview</h4>
          {participants.map((participant) => {
            const member = members.find((m) => m.id === participant.user_id);
            return (
              <div key={participant.user_id} className="flex justify-between text-sm">
                <span>{member?.full_name || "Unknown"}</span>
                <span className="font-medium">
                  {formatNumber(participant.computed_amount)} ₫
                </span>
              </div>
            );
          })}
          <div className="flex justify-between text-sm font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatNumber(totalSplit)} ₫</span>
          </div>
        </div>

        {/* Recurring Expense Toggle */}
        <FormField
          control={form.control}
          name="is_recurring"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
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
