import React, { useState } from "react";
import { format, subDays } from "date-fns";
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
  const [isOpen, setIsOpen] = useState(false);

  // Parse date string to Date object
  const parseDate = (dateString: string | undefined) => {
    if (!dateString) return undefined;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Format Date to string (YYYY-MM-DD)
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
    { label: "Today", value: formatDateString(today) },
    { label: "Yesterday", value: formatDateString(yesterday) },
  ];

  const isQuickOption = (dateValue: string | undefined) => {
    if (!dateValue) return false;
    return quickOptions.some(opt => opt.value === dateValue);
  };

  const getDisplayText = () => {
    if (!value) return "Select date";

    const quickOption = quickOptions.find(opt => opt.value === value);
    if (quickOption) return quickOption.label;

    const date = parseDate(value);
    return date ? format(date, "MMM d, yyyy") : "Select date";
  };

  return (
    <div className={cn("flex gap-1", className)}>
      {/* Quick options */}
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

      {/* Custom date picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={value && !isQuickOption(value) ? "default" : "outline"}
            className={cn(
              "h-11 px-3",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            {value && !isQuickOption(value) ? (
              <span>{format(parseDate(value)!, "MMM d")}</span>
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(formatDateString(date));
                setIsOpen(false);
              }
            }}
            initialFocus
            disabled={(date) => date > today}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
