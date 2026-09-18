import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { parseMoneyExpression } from "../../utils/money-expression";
import { initialsFor, symbolFor } from "./utils";

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface Participant {
  user_id?: string;
  pending_email?: string;
  split_value?: number | null;
  computed_amount: number;
}

interface FriendSplitEditorProps {
  members: Member[];
  currentUserId: string;
  participants: Participant[];
  splitMethod: "exact" | "percentage";
  amount?: number;
  currency: string;
  totalSplit: number;
  onSplitValueChange: (userId: string, value: number) => void;
  onExpressionStateChange?: (hasBlockingIssue: boolean) => void;
}

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const displayValue = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(value);

export const FriendSplitEditor: React.FC<FriendSplitEditorProps> = ({
  members,
  currentUserId,
  participants,
  splitMethod,
  amount,
  currency,
  totalSplit,
  onSplitValueChange,
  onExpressionStateChange,
}) => {
  const { t } = useTranslation();
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const seededMethodRef = useRef<string | null>(null);
  const lastAmountRef = useRef<number | undefined>(undefined);
  const participantsRef = useRef(participants);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  const currencySymbol = symbolFor(currency);
  const splitUnit = splitMethod === "percentage" ? "%" : currencySymbol;
  const targetTotal = splitMethod === "percentage" ? 100 : amount || 0;

  const allocated = useMemo(
    () => participants.reduce((sum, participant) => sum + (participant.split_value || 0), 0),
    [participants]
  );
  const remaining = roundMoney(targetTotal - allocated);

  const exactExpressionStates = useMemo(() => {
    if (splitMethod !== "exact") return [];

    return members.map((member) => {
      const rawValue = manualValues[member.id];
      if (rawValue === undefined) {
        return { key: member.id, hasBlockingIssue: false };
      }

      const parsedValue = parseMoneyExpression(rawValue);
      const hasBlockingIssue = parsedValue.status !== "valid" || (parsedValue.value ?? 0) < 0;
      return { key: member.id, hasBlockingIssue, parsedValue };
    });
  }, [manualValues, members, splitMethod]);

  const hasBlockingExactExpressions = exactExpressionStates.some((state) => state.hasBlockingIssue);

  useEffect(() => {
    onExpressionStateChange?.(hasBlockingExactExpressions);
  }, [hasBlockingExactExpressions, onExpressionStateChange]);

  useEffect(() => {
    return () => onExpressionStateChange?.(false);
  }, [onExpressionStateChange]);

  // Seed shares when switching into exact/%, or when amount first becomes available.
  useEffect(() => {
    const methodChanged = seededMethodRef.current !== splitMethod;
    const amountBecameAvailable =
      (lastAmountRef.current == null || lastAmountRef.current <= 0) &&
      amount != null &&
      amount > 0;

    lastAmountRef.current = amount;

    if (!methodChanged && !amountBecameAvailable) return;
    if (amount == null || amount <= 0) {
      seededMethodRef.current = null;
      return;
    }

    seededMethodRef.current = splitMethod;

    const currentParticipants = participantsRef.current;
    const hasComputedShares = currentParticipants.some((participant) => (participant.computed_amount || 0) > 0);

    members.forEach((member, index) => {
      const participant = currentParticipants.find((item) => item.user_id === member.id);
      let nextValue: number;

      if (splitMethod === "exact") {
        if (hasComputedShares && (participant?.computed_amount || 0) > 0) {
          nextValue = roundMoney(participant?.computed_amount || 0);
        } else {
          const perPerson = roundMoney(amount / members.length);
          nextValue = index === 0 ? roundMoney(amount - perPerson * (members.length - 1)) : perPerson;
        }
      } else if (hasComputedShares && amount > 0) {
        nextValue = roundMoney(((participant?.computed_amount || 0) / amount) * 100);
      } else {
        const perPerson = roundMoney(100 / members.length);
        nextValue = index === 0 ? roundMoney(100 - perPerson * (members.length - 1)) : perPerson;
      }

      onSplitValueChange(member.id, nextValue);
      setManualValues((prev) => ({ ...prev, [member.id]: displayValue(nextValue) }));
    });
  }, [amount, members, onSplitValueChange, splitMethod]);

  const applyValue = (userId: string, value: number) => {
    const clamped = Math.max(0, roundMoney(value));
    onSplitValueChange(userId, clamped);

    const other = members.find((member) => member.id !== userId);
    if (!other) return;

    const otherValue = Math.max(0, roundMoney(targetTotal - clamped));
    onSplitValueChange(other.id, otherValue);
    setManualValues((prev) => ({ ...prev, [other.id]: displayValue(otherValue) }));
  };

  const handleValueChange = (userId: string, rawValue: string) => {
    setManualValues((prev) => ({ ...prev, [userId]: rawValue }));

    if (splitMethod === "percentage") {
      const parsed = Number.parseFloat(rawValue);
      if (Number.isFinite(parsed) && parsed >= 0) {
        applyValue(userId, parsed);
      }
      return;
    }

    const parsedValue = parseMoneyExpression(rawValue);
    if (parsedValue.status === "valid" && parsedValue.value !== undefined && parsedValue.value >= 0) {
      applyValue(userId, parsedValue.value);
    }
  };

  const handleValueBlur = (userId: string) => {
    if (splitMethod !== "exact") return;

    const rawValue = manualValues[userId];
    if (rawValue === undefined) return;

    const parsedValue = parseMoneyExpression(rawValue);
    if (parsedValue.status !== "valid" || parsedValue.value === undefined || parsedValue.value < 0) {
      return;
    }

    setManualValues((prev) => ({
      ...prev,
      [userId]: Number.isInteger(parsedValue.value)
        ? formatNumber(parsedValue.value)
        : String(parsedValue.value),
    }));
  };

  const heading =
    splitMethod === "exact" ? t("expenses.enterAmounts") : t("expenses.enterPercentages");

  return (
    <div
      className="rounded-xl border border-border/60 bg-card px-4 py-3 space-y-3"
      role="group"
      aria-label={heading}
    >
      <p className="text-xs font-medium text-muted-foreground">{heading}</p>

      <div className="space-y-2">
        {members.map((member) => {
          const participant = participants.find((item) => item.user_id === member.id);
          const isSelf = member.id === currentUserId;
          const expressionState = exactExpressionStates.find((state) => state.key === member.id);
          const isInvalid = expressionState?.hasBlockingIssue ?? false;

          return (
            <label
              key={member.id}
              className="flex items-center gap-2.5"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={member.avatar_url || undefined} alt="" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {initialsFor(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate min-w-0 w-24 shrink-0">
                {isSelf ? t("common.you") : member.full_name}
              </span>
              <div className="relative flex-1 min-w-0">
                <Input
                  type={splitMethod === "exact" ? "text" : "number"}
                  inputMode={splitMethod === "exact" ? "text" : "decimal"}
                  min={splitMethod === "percentage" ? 0 : undefined}
                  max={splitMethod === "percentage" ? 100 : undefined}
                  step={splitMethod === "percentage" ? "0.01" : undefined}
                  placeholder="0"
                  value={manualValues[member.id] ?? participant?.split_value ?? ""}
                  onChange={(event) => handleValueChange(member.id, event.target.value)}
                  onBlur={() => handleValueBlur(member.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  aria-label={
                    isSelf
                      ? t("expenses.yourShare")
                      : t("expenses.friendShare", { name: member.full_name })
                  }
                  aria-invalid={isInvalid}
                  className="pr-8 h-9 text-sm tabular-nums"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {splitUnit}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      {splitMethod === "exact" && hasBlockingExactExpressions && (
        <p className="text-xs text-muted-foreground">{t("expenses.finishSplitExpression")}</p>
      )}

      {amount != null && amount > 0 && Math.abs(remaining) > 1 && !hasBlockingExactExpressions && (
        <p
          className={cn(
            "text-xs",
            remaining < 0 ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {remaining < 0
            ? t("expenses.friendSplitOverAllocated", {
                amount: `${formatNumber(Math.abs(remaining))}${splitMethod === "percentage" ? "%" : ` ${currencySymbol}`}`,
              })
            : t("expenses.friendSplitRemaining", {
                amount: `${formatNumber(remaining)}${splitMethod === "percentage" ? "%" : ` ${currencySymbol}`}`,
              })}
        </p>
      )}

      {amount != null && amount > 0 && splitMethod === "exact" && Math.abs(totalSplit - amount) > 1 && !hasBlockingExactExpressions && (
        <p className="text-xs text-destructive">
          {t("expenses.splitMismatch", {
            splitAmount: `${formatNumber(totalSplit)} ${currencySymbol}`,
            expenseAmount: `${formatNumber(amount)} ${currencySymbol}`,
          })}
        </p>
      )}
    </div>
  );
};
