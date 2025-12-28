import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "@refinedev/react-hook-form";
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

  const handleFormSubmit = (data: PaymentFormSchema) => {
    const formValues: PaymentFormValues = {
      ...data,
      from_user: fromUserId,
      context_type: "group" as const,
    };
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
              <Select onValueChange={field.onChange} value={field.value}>
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
