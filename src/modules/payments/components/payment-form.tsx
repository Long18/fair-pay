import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
import { useState } from "react";
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
import { CalendarIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PaymentFormValues } from "../types";

const paymentSchema = z.object({
  to_user: z.string().uuid("Please select who you're paying"),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string(),
  payment_date: z.string(),
  note: z.string().max(500, "Note is too long").optional(),
});

type PaymentFormSchema = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  fromUserId: string;
  fromUserName: string;
  members: Array<{ id: string; full_name: string }>;
  suggestedAmount?: number;
  suggestedToUserId?: string;
  onSubmit: (values: PaymentFormValues) => void;
  isLoading?: boolean;
}

export const PaymentForm = ({
  fromUserId,
  fromUserName,
  members,
  suggestedAmount,
  suggestedToUserId,
  onSubmit,
  isLoading,
}: PaymentFormProps) => {
  const { tap, success } = useHaptics();
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      to_user: suggestedToUserId || "",
      amount: suggestedAmount || 0,
      currency: "VND",
      payment_date: new Date().toISOString().split("T")[0],
      note: "",
    },
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const handleFormSubmit = (data: PaymentFormSchema) => {
    const formValues: PaymentFormValues = {
      ...data,
      from_user: fromUserId,
      context_type: "group" as const,
    };
    success();
    onSubmit(formValues);
  };

  // Filter out the current user from recipient options
  const availableRecipients = members.filter(m => m.id !== fromUserId);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">From</p>
          <p className="font-medium">{fromUserName} (You)</p>
        </div>

        <FormField
          control={form.control}
          name="to_user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <Select onValueChange={(v) => { tap(); field.onChange(v); }} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who you're paying" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRecipients.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
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
              <FormDescription>
                Enter the amount you're paying
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_date"
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
                        onClick={() => tap()}
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
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a note about this payment..."
                  className="resize-none"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Recording..." : "Record Payment"}
        </Button>
      </form>
    </Form>
  );
};
