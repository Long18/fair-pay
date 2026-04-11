import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "@/lib/locale-utils";
import { cn } from "@/lib/utils";
import {
  hasMoneyExpressionOperator,
  parseMoneyExpression,
  type MoneyExpressionStatus,
} from "../utils/money-expression";

export interface AmountExpressionState {
  rawValue: string;
  status: MoneyExpressionStatus;
  value?: number;
}

interface AmountInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  onExpressionStateChange?: (state: AmountExpressionState) => void;
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
  onExpressionStateChange,
  currency,
  placeholder = "0.00",
  className,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsedValue = useMemo(() => parseMoneyExpression(displayValue), [displayValue]);
  const isPositiveAmount = parsedValue.status === "valid" && (parsedValue.value ?? 0) > 0;
  const showPreview = hasMoneyExpressionOperator(displayValue) && parsedValue.status === "valid" && isPositiveAmount;
  const helperMessage = parsedValue.status === "invalid"
    ? "Enter a valid expression"
    : parsedValue.status === "incomplete"
      ? "Finish the expression to apply the amount"
      : parsedValue.status === "valid" && !isPositiveAmount && displayValue
        ? "Amount must be greater than 0"
        : null;

  useEffect(() => {
    if (isFocused) {
      return;
    }

    if (value !== undefined && value !== null) {
      const nextDisplayValue = Number.isInteger(value) ? formatNumber(value) : value.toString();
      setDisplayValue(nextDisplayValue);
      onExpressionStateChange?.({
        rawValue: nextDisplayValue,
        status: "valid",
        value,
      });
      return;
    }

    if (!displayValue) {
      onExpressionStateChange?.({
        rawValue: "",
        status: "empty",
      });
    }
  }, [displayValue, isFocused, onExpressionStateChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const nextParsedValue = parseMoneyExpression(inputValue);

    setDisplayValue(inputValue);
    onExpressionStateChange?.({
      rawValue: inputValue,
      status: nextParsedValue.status,
      value: nextParsedValue.value,
    });

    if (nextParsedValue.status === "valid" && (nextParsedValue.value ?? 0) > 0) {
      onChange(nextParsedValue.value);
      return;
    }

    onChange(undefined);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Select all text on focus for easy editing
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (parsedValue.status !== "valid" || parsedValue.value === undefined || parsedValue.value <= 0) {
      return;
    }

    setDisplayValue(Number.isInteger(parsedValue.value) ? formatNumber(parsedValue.value) : parsedValue.value.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Blur input on Enter to dismiss keyboard on mobile
    if (e.key === "Enter") {
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
        inputMode="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={parsedValue.status === "invalid" || (parsedValue.status === "valid" && !isPositiveAmount)}
        className={cn(
          "w-full h-11 pl-10 pr-3",
          "text-lg font-medium",
          "border border-input rounded-lg bg-background",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "placeholder:text-muted-foreground/50"
        )}
      />
      {(showPreview || helperMessage) && (
        <div className="mt-2 min-h-5 text-sm">
          {showPreview && (
            <span className="text-muted-foreground">
              = {formatNumber(parsedValue.value ?? 0)} {currencySymbol}
            </span>
          )}
          {!showPreview && helperMessage && (
            <span
              className={cn(
                parsedValue.status === "invalid" || (parsedValue.status === "valid" && !isPositiveAmount)
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {helperMessage}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
