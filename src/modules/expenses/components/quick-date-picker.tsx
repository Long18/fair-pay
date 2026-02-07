import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { format, subDays } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuickDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const QuickDatePicker: React.FC<QuickDatePickerProps> = ({
  value,
  onChange,
  className,
  disabled = false,
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const dateLocale = i18n.language === "vi" ? vi : enUS;

  const parseDate = (dateString: string | undefined) => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDate = parseDate(value);
  const today = new Date();
  const yesterday = subDays(today, 1);

  const quickOptions = [
    { label: t("expenses.today"), value: formatDateString(today) },
    { label: t("expenses.yesterday"), value: formatDateString(yesterday) },
  ];

  const isQuickOption = (dateValue: string | undefined) => {
    if (!dateValue) return false;
    return quickOptions.some(opt => opt.value === dateValue);
  };

  const getDisplayText = () => {
    if (!value) return t("expenses.selectDate");

    const quickOption = quickOptions.find(opt => opt.value === value);
    if (quickOption) return quickOption.label;

    const date = parseDate(value);
    return date ? format(date, "MMM d, yyyy", { locale: dateLocale }) : t("expenses.selectDate");
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <div className="flex gap-1 flex-1">
        {quickOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className="flex-1 h-11"
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={value && !isQuickOption(value) ? "default" : "outline"}
            className={cn("h-11 px-3", !value && "text-muted-foreground")}
            disabled={disabled}
          >
            {value && !isQuickOption(value) ? (
              <span>{format(parseDate(value)!, "MMM d", { locale: dateLocale })}</span>
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="end"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => {
            // On mobile, taps inside the calendar portal can be misidentified
            // as "outside" clicks. Only close if truly outside.
            const target = e.target as HTMLElement;
            if (target?.closest?.("[data-slot='popover-content']")) {
              e.preventDefault();
            }
          }}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(formatDateString(date));
                setIsOpen(false);
              }
            }}
            disabled={(date) => date > today}
            locale={dateLocale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
