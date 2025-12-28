import { useForm } from '@refinedev/react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserSettings, CURRENCIES, DATE_FORMATS, THEMES, Theme, DateFormat } from '../types';
import { Loader2 } from 'lucide-react';

const displaySettingsSchema = z.object({
  default_currency: z.string(),
  date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  theme: z.enum(['light', 'dark', 'system']),
});

interface DisplaySettingsFormProps {
  settings?: UserSettings;
  onSave: (values: any) => Promise<void>;
  isUpdating: boolean;
}

export function DisplaySettingsForm({ settings, onSave, isUpdating }: DisplaySettingsFormProps) {
  const form = useForm({
    resolver: zodResolver(displaySettingsSchema),
    defaultValues: {
      default_currency: settings?.default_currency || 'VND',
      date_format: (settings?.date_format || 'DD/MM/YYYY') as DateFormat,
      theme: (settings?.theme || 'system') as Theme,
    },
  });

  const handleSubmit = async (values: z.infer<typeof displaySettingsSchema>) => {
    await onSave(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="default_currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiền tệ mặc định</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tiền tệ" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Tiền tệ mặc định sẽ được sử dụng khi tạo chi tiêu mới
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Định dạng ngày</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn định dạng" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label} - Ví dụ: {format.example}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Định dạng ngày hiển thị trong toàn bộ ứng dụng
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Giao diện</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  {THEMES.map((theme) => (
                    <FormItem key={theme.value} className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={theme.value} />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="font-normal cursor-pointer">
                          {theme.label}
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {theme.description}
                        </p>
                      </div>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isUpdating}>
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Lưu cài đặt
        </Button>
      </form>
    </Form>
  );
}
