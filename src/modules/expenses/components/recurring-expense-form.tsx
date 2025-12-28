import { Control, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { InfoIcon, CalendarIcon } from "@/components/ui/icons";
import {
  RecurringExpenseFormValues,
  RECURRING_FREQUENCY_LABELS,
  RecurringFrequency,
  getFrequencyDescription,
  calculateNextOccurrence,
} from '../types/recurring';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';

interface RecurringExpenseFormProps {
  control: Control<any>;
  isRecurring: boolean;
}

export function RecurringExpenseForm({ control, isRecurring }: RecurringExpenseFormProps) {
  if (!isRecurring) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <InfoIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Cấu hình chi phí định kỳ - hệ thống sẽ tự động tạo chi phí theo lịch
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">Tần suất</Label>
          <Controller
            name="recurring.frequency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tần suất" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRING_FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interval">Khoảng cách</Label>
          <Controller
            name="recurring.interval"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                min={1}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                placeholder="1"
              />
            )}
          />
          <Controller
            name="recurring.frequency"
            control={control}
            render={({ field: freqField }) => (
              <Controller
                name="recurring.interval"
                control={control}
                render={({ field: intervalField }) => (
                  <p className="text-xs text-muted-foreground">
                    {getFrequencyDescription(
                      freqField.value as RecurringFrequency,
                      intervalField.value || 1
                    )}
                  </p>
                )}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ngày bắt đầu</Label>
          <Controller
            name="recurring.start_date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, 'PPP', { locale: vi })
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Ngày kết thúc (tùy chọn)</Label>
          <Controller
            name="recurring.end_date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !field.value && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, 'PPP', { locale: vi })
                    ) : (
                      <span>Không giới hạn</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => field.onChange(null)}
                      className="w-full"
                    >
                      Xóa ngày kết thúc
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notify_before_days">Thông báo trước (ngày)</Label>
        <Controller
          name="recurring.notify_before_days"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              min={0}
              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
              placeholder="1"
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          Số ngày trước khi tạo chi phí để gửi thông báo (0 = thông báo ngày tạo)
        </p>
      </div>

      <Controller
        name="recurring.start_date"
        control={control}
        render={({ field: startField }) => (
          <Controller
            name="recurring.frequency"
            control={control}
            render={({ field: freqField }) => (
              <Controller
                name="recurring.interval"
                control={control}
                render={({ field: intervalField }) => {
                  if (!startField.value) return <></>;

                  const nextDate = calculateNextOccurrence(
                    startField.value,
                    freqField.value as RecurringFrequency,
                    intervalField.value || 1
                  );

                  return (
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Xem trước:</strong> Chi phí đầu tiên sẽ được tạo vào{' '}
                        <strong>{format(startField.value, 'PPP', { locale: vi })}</strong>.
                        Chi phí tiếp theo sẽ được tạo vào{' '}
                        <strong>{format(nextDate, 'PPP', { locale: vi })}</strong>.
                      </AlertDescription>
                    </Alert>
                  );
                }}
              />
            )}
          />
        )}
      />
    </div>
  );
}
