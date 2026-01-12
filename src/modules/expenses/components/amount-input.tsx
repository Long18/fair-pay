import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AmountInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  currency: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const currencySymbols: Record<string, string> = {
  VND: "₫",
  USD: "$",
  EUR: "€",
};

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  currency,
  placeholder = "0.00",
  className,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(value.toString());
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string
    if (inputValue === "") {
      setDisplayValue("");
      onChange(undefined);
      return;
    }

    // Only allow numbers and decimal point
    const regex = /^\d*\.?\d*$/;
    if (regex.test(inputValue)) {
      setDisplayValue(inputValue);
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      }
    }
  };

  const handleFocus = () => {
    // Select all text on focus for easy editing
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Blur input on Enter to dismiss keyboard on mobile
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const currencySymbol = currencySymbols[currency] || currency;

  return (
    <div className={cn("relative", className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground pointer-events-none">
        {currencySymbol}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full h-11 pl-10 pr-3",
          "text-lg font-medium",
          "border border-input rounded-lg bg-background",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "placeholder:text-muted-foreground/50"
        )}
      />
    </div>
  );
};
