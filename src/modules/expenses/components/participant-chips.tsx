import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  UserPlusIcon,
  XIcon,
  CheckIcon,
  UsersIcon,
  MailIcon,
  UserCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import {
  parseMoneyExpression,
} from "../utils/money-expression";

interface Participant {
  user_id?: string;
  pending_email?: string;
  split_value?: number | null;
  computed_amount: number;
}

interface Member {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface ParticipantChipsProps {
  members: Member[];
  participants: Participant[];
  availableMembers: Member[];
  currentUserId: string;
  splitMethod: "equal" | "exact" | "percentage";
  amount?: number;
  currency: string;
  onAddParticipant: (userId: string) => void;
  onAddParticipantByEmail: (email: string) => void;
  onRemoveParticipant: (userIdOrEmail: string) => void;
  onSplitValueChange: (userIdOrEmail: string, value: number) => void;
  onExpressionStateChange?: (hasBlockingIssue: boolean) => void;
  totalSplit: number;
}

const PAGE_SIZE = 5;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

export const ParticipantChips: React.FC<ParticipantChipsProps> = ({
  members,
  participants,
  currentUserId,
  splitMethod,
  amount,
  currency,
  onAddParticipant,
  onAddParticipantByEmail,
  onRemoveParticipant,
  onSplitValueChange,
  onExpressionStateChange,
  totalSplit,
}) => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const isManualSplit = splitMethod !== "equal";
  const currencySymbol = currency === "VND" ? "₫" : currency === "USD" ? "$" : "€";
  const splitUnit = splitMethod === "percentage" ? "%" : currencySymbol;

  const getKey = (p: Participant): string => p.user_id || p.pending_email || "";

  const handleManualValueChange = (key: string, value: string) => {
    setManualValues((prev) => ({ ...prev, [key]: value }));

    if (splitMethod !== "exact") {
      onSplitValueChange(key, parseFloat(value) || 0);
      return;
    }

    const parsedValue = parseMoneyExpression(value);
    if (parsedValue.status === "valid" && parsedValue.value !== undefined && parsedValue.value >= 0) {
      onSplitValueChange(key, parsedValue.value);
    }
  };

  const handleManualValueBlur = (key: string) => {
    if (splitMethod !== "exact") {
      return;
    }

    const rawValue = manualValues[key];
    if (rawValue === undefined) {
      return;
    }

    const parsedValue = parseMoneyExpression(rawValue);
    if (parsedValue.status !== "valid" || parsedValue.value === undefined || parsedValue.value < 0) {
      return;
    }

    const resolvedValue = parsedValue.value;
    setManualValues((prev) => ({
      ...prev,
      [key]: Number.isInteger(resolvedValue) ? formatNumber(resolvedValue) : resolvedValue.toString(),
    }));
  };

  const isSelected = useCallback(
    (memberId: string) => participants.some((p) => p.user_id === memberId),
    [participants]
  );

  // Pagination
  const memberCount = members.length;
  const totalPages = Math.ceil(memberCount / PAGE_SIZE);
  const needsPagination = totalPages > 1;
  const pageStart = currentPage * PAGE_SIZE;
  const visibleMembers = needsPagination
    ? members.slice(pageStart, pageStart + PAGE_SIZE)
    : members;

  const selectedMemberCount = members.filter((m) => isSelected(m.id)).length;
  const allSelected = memberCount > 0 && selectedMemberCount === memberCount;

  const pendingParticipants = useMemo(
    () => participants.filter((p) => !!p.pending_email && !p.user_id),
    [participants]
  );

  const exactExpressionStates = useMemo(() => {
    if (splitMethod !== "exact") {
      return [];
    }

    return participants
      .map((participant) => {
        const key = getKey(participant);
        const rawValue = manualValues[key];

        if (rawValue === undefined) {
          return null;
        }

        const parsedValue = parseMoneyExpression(rawValue);
        const hasBlockingIssue = parsedValue.status !== "valid" || (parsedValue.value ?? 0) < 0;

        return {
          key,
          rawValue,
          parsedValue,
          hasBlockingIssue,
        };
      })
      .filter((state): state is NonNullable<typeof state> => Boolean(state));
  }, [manualValues, participants, splitMethod]);

  const hasBlockingExactExpressions = useMemo(
    () => exactExpressionStates.some((state) => state.hasBlockingIssue),
    [exactExpressionStates]
  );

  useEffect(() => {
    onExpressionStateChange?.(hasBlockingExactExpressions);
  }, [hasBlockingExactExpressions, onExpressionStateChange]);

  const getExpressionState = (key: string) => {
    const rawValue = manualValues[key];
    if (rawValue === undefined) {
      return null;
    }

    const parsedValue = parseMoneyExpression(rawValue);
    const isNegativeValue = parsedValue.status === "valid" && (parsedValue.value ?? 0) < 0;

    return {
      rawValue,
      parsedValue,
      isNegativeValue,
    };
  };

  const getExactSplitPreview = (key: string, fallbackValue: number) => {
    const expressionState = getExpressionState(key);

    if (!expressionState) {
      return {
        text: `= ${formatNumber(fallbackValue)} ${currencySymbol}`,
        tone: "default" as const,
      };
    }

    if (expressionState.parsedValue.status === "valid" && expressionState.parsedValue.value !== undefined && !expressionState.isNegativeValue) {
      return {
        text: `= ${formatNumber(expressionState.parsedValue.value)} ${currencySymbol}`,
        tone: "default" as const,
      };
    }

    if (expressionState.parsedValue.status === "invalid" || expressionState.isNegativeValue) {
      return {
        text: "Invalid expression",
        tone: "error" as const,
      };
    }

    if (expressionState.parsedValue.status === "empty") {
      return {
        text: "Enter amount",
        tone: "muted" as const,
      };
    }

    return {
      text: "Finish expression",
      tone: "muted" as const,
    };
  };

  const handleToggleMember = useCallback(
    (memberId: string) => {
      tap();
      if (isSelected(memberId)) {
        if (participants.length <= 1) return;
        onRemoveParticipant(memberId);
      } else {
        onAddParticipant(memberId);
      }
    },
    [isSelected, participants.length, onRemoveParticipant, onAddParticipant, tap]
  );

  const handleSelectAll = useCallback(() => {
    tap();
    if (allSelected) {
      members.forEach((m) => {
        if (m.id !== currentUserId && isSelected(m.id)) onRemoveParticipant(m.id);
      });
    } else {
      members.forEach((m) => {
        if (!isSelected(m.id)) onAddParticipant(m.id);
      });
    }
  }, [allSelected, members, currentUserId, isSelected, onRemoveParticipant, onAddParticipant, tap]);

  const handleAddByEmail = () => {
    tap();
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) { setEmailError(t("auth.invalidEmail")); return; }
    const normalized = trimmed.toLowerCase();
    if (participants.some((p) => p.pending_email === normalized)) {
      setEmailError(t("expenses.emailAlreadyAdded")); return;
    }
    onAddParticipantByEmail(normalized);
    setEmailInput(""); setEmailError("");
  };

  const getParticipantForMember = (memberId: string) =>
    participants.find((p) => p.user_id === memberId);

  return (
    <div className="space-y-3 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
          {t("expenses.participants")}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {selectedMemberCount}/{memberCount}
          </span>
          {memberCount > 2 && (
            <Button
              type="button"
              variant={allSelected ? "secondary" : "outline"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 rounded-full transition-all",
                allSelected && "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15"
              )}
              onClick={handleSelectAll}
              aria-label={allSelected ? t("common.deselectAll") : t("common.selectAll")}
            >
              {allSelected
                ? <><UserCheckIcon size={14} />{t("common.deselectAll")}</>
                : <><UsersIcon size={14} />{t("common.selectAll")}</>}
            </Button>
          )}
        </div>
      </div>

      {/* Member list with inline split inputs */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="divide-y divide-border/60">
          {visibleMembers.map((member) => {
            const selected = isSelected(member.id);
            const isSelf = member.id === currentUserId;
            const participant = getParticipantForMember(member.id);
            const key = member.id;
            const exactSplitPreview = participant
              ? getExactSplitPreview(key, participant.computed_amount)
              : null;

            return (
              <div key={key} className={cn(
                "transition-colors",
                selected ? "bg-primary/[0.04]" : "opacity-60"
              )}>
                <button
                  type="button"
                  onClick={() => handleToggleMember(member.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 text-left transition-colors cursor-pointer",
                    "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    isManualSplit && selected ? "py-2" : "py-2.5"
                  )}
                  aria-pressed={selected}
                  aria-label={`${selected ? "Remove" : "Add"} ${member.full_name}`}
                >
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border flex-shrink-0 transition-colors",
                    selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                  )} aria-hidden>
                    {selected && <CheckIcon className="h-3 w-3" />}
                  </div>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{member.full_name}</span>
                    {isSelf && (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] flex-shrink-0">
                        {t("common.you")}
                      </Badge>
                    )}
                  </div>
                  {!isManualSplit && selected && participant && amount && amount > 0 && (
                    <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">
                      {formatNumber(participant.computed_amount)} {currencySymbol}
                    </span>
                  )}
                </button>

                {/* Inline split input */}
                {isManualSplit && selected && participant && (
                  <div className="flex items-center gap-2 px-3 pb-2.5 pl-[4.25rem]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex-1 relative min-w-0">
                      <Input
                        type={splitMethod === "exact" ? "text" : "number"}
                        inputMode={splitMethod === "exact" ? "text" : "decimal"}
                        placeholder="0"
                        value={manualValues[key] ?? participant.split_value ?? ""}
                        onChange={(e) => handleManualValueChange(key, e.target.value)}
                        onBlur={() => handleManualValueBlur(key)}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        aria-invalid={exactSplitPreview?.tone === "error"}
                        className="pr-8 h-8 w-full text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{splitUnit}</span>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums w-24 text-right flex-shrink-0",
                        exactSplitPreview?.tone === "error" && "text-destructive",
                        exactSplitPreview?.tone === "muted" && "text-muted-foreground",
                        exactSplitPreview?.tone === "default" && "text-muted-foreground"
                      )}
                    >
                      {exactSplitPreview?.text}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Numbered pagination */}
        {needsPagination && (
          <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => { tap(); setCurrentPage((p) => Math.max(0, p - 1)); }}
              disabled={currentPage === 0}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                currentPage === 0
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              )}
              aria-label="Previous page"
            >
              <ChevronLeftIcon size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { tap(); setCurrentPage(i); }}
                className={cn(
                  "h-7 min-w-7 px-1.5 flex items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer",
                  i === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-label={`Page ${i + 1}`}
                aria-current={i === currentPage ? "page" : undefined}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { tap(); setCurrentPage((p) => Math.min(totalPages - 1, p + 1)); }}
              disabled={currentPage === totalPages - 1}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                currentPage === totalPages - 1
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
              )}
              aria-label="Next page"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Pending email participants */}
      {pendingParticipants.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("expenses.pendingInvites")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {pendingParticipants.map((p) => {
              const pKey = getKey(p);
              return (
                <div
                  key={pKey}
                  className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/30 text-sm"
                >
                  <MailIcon className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="truncate max-w-[160px] text-xs">{p.pending_email}</span>
                  {amount && amount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatNumber(p.computed_amount)} {currencySymbol}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { tap(); onRemoveParticipant(pKey); }}
                    className="p-0.5 rounded-full hover:bg-destructive/10 transition-colors flex-shrink-0 cursor-pointer"
                    aria-label={`Remove ${p.pending_email}`}
                  >
                    <XIcon className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline split inputs for pending email participants (exact/percentage) */}
      {isManualSplit && pendingParticipants.length > 0 && (
        <div className="space-y-2">
          {pendingParticipants.map((p) => {
            const pKey = getKey(p);
            const exactSplitPreview = getExactSplitPreview(pKey, p.computed_amount);
            return (
              <div key={pKey} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0 w-28 flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <MailIcon className="h-3 w-3 text-amber-500" />
                  </div>
                  <span className="text-xs truncate text-amber-600 dark:text-amber-400">{p.pending_email}</span>
                </div>
                <div className="flex-1 relative min-w-0">
                  <Input
                    type={splitMethod === "exact" ? "text" : "number"}
                    inputMode={splitMethod === "exact" ? "text" : "decimal"}
                    placeholder="0"
                    value={manualValues[pKey] ?? p.split_value ?? ""}
                    onChange={(e) => handleManualValueChange(pKey, e.target.value)}
                    onBlur={() => handleManualValueBlur(pKey)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    aria-invalid={exactSplitPreview.tone === "error"}
                    className="pr-8 h-8 w-full text-sm"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{splitUnit}</span>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums w-24 text-right flex-shrink-0",
                    exactSplitPreview.tone === "error" && "text-destructive",
                    exactSplitPreview.tone === "muted" && "text-muted-foreground",
                    exactSplitPreview.tone === "default" && "text-muted-foreground"
                  )}
                >
                  {exactSplitPreview.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {splitMethod === "exact" && hasBlockingExactExpressions && (
        <p className="text-xs text-muted-foreground">
          Complete any in-progress expressions before submitting.
        </p>
      )}

      {/* Add by email */}
      <div>
        {!showEmailInput ? (
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => { tap(); setShowEmailInput(true); }}
          >
            <UserPlusIcon className="h-3.5 w-3.5" />
            {t("expenses.addByEmail")}
          </Button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                type="email" placeholder={t("auth.emailPlaceholder")}
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); if (emailError) setEmailError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddByEmail(); } }}
                className="h-9 flex-1 text-sm" autoFocus
              />
              <Button type="button" variant="outline" size="sm" className="h-9 px-3 flex-shrink-0 cursor-pointer" onClick={handleAddByEmail}>
                {t("expenses.add")}
              </Button>
              <Button
                type="button" variant="ghost" size="sm" className="h-9 px-2 flex-shrink-0 cursor-pointer"
                onClick={() => { tap(); setShowEmailInput(false); setEmailInput(""); setEmailError(""); }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
        )}
      </div>

      {/* Total split summary */}
      {participants.length > 0 && amount && (
        <div className={cn(
          "flex justify-between items-center p-3 rounded-lg",
          "bg-muted/50 border",
          Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && "border-destructive bg-destructive/10"
        )}>
          <span className="font-semibold text-sm">{t("expenses.totalSplit")}</span>
          <span className={cn(
            "font-bold tabular-nums",
            Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" ? "text-destructive" : "text-primary"
          )}>
            {formatNumber(totalSplit)} {currencySymbol}
          </span>
        </div>
      )}

      {Math.abs(totalSplit - (amount || 0)) > 1 && splitMethod !== "equal" && amount && (
        <p className="text-sm text-destructive flex items-start gap-2">
          <span>⚠️</span>
          <span>{t("expenses.splitMismatch", {
            splitAmount: `${formatNumber(totalSplit)} ${currencySymbol}`,
            expenseAmount: `${formatNumber(amount)} ${currencySymbol}`,
          })}</span>
        </p>
      )}

      {participants.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">{t("expenses.noParticipants")}</p>
          <p className="text-xs mt-1">{t("expenses.clickToAdd")}</p>
        </div>
      )}
    </div>
  );
};
