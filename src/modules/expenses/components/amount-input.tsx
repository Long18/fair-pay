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

function formatAmountValue(value: number): string {
  return Number.isInteger(value) ? formatNumber(value) : value.toString();
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  onExpressionStateChange,
  currency,
  placeholder = "0.00",
  className,
  disabled = false,
}) => {
  // null = not focused; string = in-progress edit draft
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isFocused = draftValue !== null;
  const displayValue =
    draftValue !== null
      ? draftValue
      : value !== undefined && value !== null && Number.isFinite(value)
        ? formatAmountValue(value)
        : "";

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

  const expressionState = useMemo<AmountExpressionState>(() => {
    if (value !== undefined && value !== null && Number.isFinite(value) && !isFocused) {
      return {
        rawValue: displayValue,
        status: "valid",
        value,
      };
    }

    return {
      rawValue: displayValue,
      status: displayValue ? parsedValue.status : "empty",
      value: parsedValue.value,
    };
  }, [displayValue, isFocused, parsedValue.status, parsedValue.value, value]);

  useEffect(() => {
    onExpressionStateChange?.(expressionState);
  }, [expressionState, onExpressionStateChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const nextParsedValue = parseMoneyExpression(inputValue);

    setDraftValue(inputValue);

    if (nextParsedValue.status === "valid" && (nextParsedValue.value ?? 0) > 0) {
      onChange(nextParsedValue.value);
      return;
    }

    onChange(undefined);
  };

  const handleFocus = () => {
    setDraftValue(displayValue);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    if (parsedValue.status === "valid" && parsedValue.value !== undefined && parsedValue.value > 0) {
      onChange(parsedValue.value);
    }
    setDraftValue(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
