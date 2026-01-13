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
import { vi, enUS } from 'date-fns/locale';
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
import { useTranslation } from 'react-i18next';

interface RecurringExpenseFormProps {
  control: Control<any>;
  isRecurring: boolean;
}

export function RecurringExpenseForm({ control, isRecurring }: RecurringExpenseFormProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'vi' ? vi : enUS;

  if (!isRecurring) {
    return null;
  }

  return (
    <div className="space-y-4 border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <InfoIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t('recurring.configureRecurring')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="frequency">{t('recurring.frequency')}</Label>
          <Controller
            name="recurring.frequency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurring.selectFrequency')} />
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
          <Label htmlFor="interval">{t('recurring.interval')}</Label>
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
          <Label>{t('recurring.startDate')}</Label>
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
                      format(field.value, 'PPP', { locale: dateLocale })
                    ) : (
                      <span>{t('recurring.selectStartDate')}</span>
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
          <Label>{t('recurring.endDate')}</Label>
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
                      format(field.value, 'PPP', { locale: dateLocale })
                    ) : (
                      <span>{t('recurring.noLimit')}</span>
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
                      {t('recurring.clearEndDate')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notify_before_days">{t('recurring.notifyBeforeDays')}</Label>
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
          {t('recurring.notifyBeforeDaysDescription')}
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
                        <strong>{t('recurring.preview')}:</strong> {t('recurring.firstExpenseWillBeCreated')}{' '}
                        <strong>{format(startField.value, 'PPP', { locale: dateLocale })}</strong>.
                        {t('recurring.nextExpenseWillBeCreated')}{' '}
                        <strong>{format(nextDate, 'PPP', { locale: dateLocale })}</strong>.
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
