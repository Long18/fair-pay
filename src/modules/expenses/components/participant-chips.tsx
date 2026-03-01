import React, { useState, useCallback, useMemo } from "react";
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
} from "@/components/ui/icons";

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
  totalSplit: number;
}

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
};

export const ParticipantChips: React.FC<ParticipantChipsProps> = ({
  members,
  participants,
  availableMembers: _availableMembers,
  currentUserId,
  splitMethod,
  amount,
  currency,
  onAddParticipant,
  onAddParticipantByEmail,
  onRemoveParticipant,
  onSplitValueChange,
  totalSplit,
}) => {
  const { t } = useTranslation();
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const getKey = (p: Participant): string => p.user_id || p.pending_email || "";

  const handleManualValueChange = (key: string, value: string) => {
    setManualValues((prev) => ({ ...prev, [key]: value }));
    const numValue = parseFloat(value) || 0;
    onSplitValueChange(key, numValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const getMember = (userId: string): Member | undefined => {
    return members.find((m) => m.id === userId);
  };

  const getMemberName = (userId: string) => {
    return getMember(userId)?.full_name || t("expenses.unknown");
  };

  const getDisplayName = (p: Participant): string => {
    if (p.user_id) return getMemberName(p.user_id);
    return p.pending_email || t("expenses.unknown");
  };

  const getAvatarUrl = (p: Participant): string | undefined => {
    if (p.user_id) return getMember(p.user_id)?.avatar_url || undefined;
    return undefined;
  };

  const isCurrentUser = (p: Participant) =>
    !!p.user_id && p.user_id === currentUserId;
  const isPending = (p: Participant) => !!p.pending_email && !p.user_id;
  const isSelected = useCallback(
    (memberId: string) => participants.some((p) => p.user_id === memberId),
    [participants]
  );

  const currencySymbol =
    currency === "VND" ? "₫" : currency === "USD" ? "$" : "€";

  // Derived state
  const memberCount = members.length;
  const selectedMemberCount = members.filter((m) => isSelected(m.id)).length;
  const allSelected = memberCount > 0 && selectedMemberCount === memberCount;
  const someSelected = selectedMemberCount > 0 && selectedMemberCount < memberCount;

  const pendingParticipants = useMemo(
    () => participants.filter((p) => isPending(p)),
    [participants]
  );

  const handleToggleMember = useCallback(
    (memberId: string) => {
      if (isSelected(memberId)) {
        // Don't allow removing the last participant
        if (participants.length <= 1) return;
        onRemoveParticipant(memberId);
      } else {
        onAddParticipant(memberId);
      }
    },
    [isSelected, participants.length, onRemoveParticipant, onAddParticipant]
  );

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      // Deselect all except current user
      members.forEach((m) => {
        if (m.id !== currentUserId && isSelected(m.id)) {
          onRemoveParticipant(m.id);
        }
      });
    } else {
      // Select all unselected members
      members.forEach((m) => {
        if (!isSelected(m.id)) {
          onAddParticipant(m.id);
        }
      });
    }
  }, [allSelected, members, currentUserId, isSelected, onRemoveParticipant, onAddParticipant]);

  const handleAddByEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    const normalized = trimmed.toLowerCase();
    if (participants.some((p) => p.pending_email === normalized)) {
      setEmailError(t("expenses.emailAlreadyAdded"));
      return;
    }
    onAddParticipantByEmail(normalized);
    setEmailInput("");
    setEmailError("");
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddByEmail();
    }
  };

  // Find participant data for a member
  const getParticipantForMember = (memberId: string) =>
    participants.find((p) => p.user_id === memberId);

  return (
    <div className="space-y-3 overflow-x-hidden max-w-full">
      {/* Header with count and Select All */}
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
              {allSelected ? (
                <>
                  <UserCheckIcon size={14} />
                  {t("common.deselectAll")}
                </>
              ) : (
                <>
                  <UsersIcon size={14} />
                  {t("common.selectAll")}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Member Selection Grid */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="divide-y divide-border/60">
          {members.map((member) => {
            const selected = isSelected(member.id);
            const isSelf = member.id === currentUserId;
            const participant = getParticipantForMember(member.id);

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => handleToggleMember(member.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  selected && "bg-primary/[0.04]",
                  !selected && "opacity-60"
                )}
                aria-pressed={selected}
                aria-label={`${selected ? "Remove" : "Add"} ${member.full_name}`}
              >
                {/* Checkbox visual indicator */}
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border flex-shrink-0 transition-colors",
                    selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                  aria-hidden
                >
                  {selected && <CheckIcon className="h-3 w-3" />}
                </div>

                {/* Avatar */}
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={member.avatar_url || undefined}
                    alt={member.full_name}
                  />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>

                {/* Name + You badge */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {member.full_name}
                  </span>
                  {isSelf && (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] flex-shrink-0"
                    >
                      {t("common.you")}
                    </Badge>
                  )}
                </div>

                {/* Split amount (shown when selected and amount exists) */}
                {selected && participant && amount && amount > 0 && (
                  <span className="text-xs font-semibold text-primary tabular-nums flex-shrink-0">
                    {formatNumber(participant.computed_amount)}{" "}
                    {currencySymbol}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending email participants */}
      {pendingParticipants.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t("expenses.pendingInvites")}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {pendingParticipants.map((p) => {
              const key = getKey(p);
              return (
                <div
                  key={key}
                  className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/30 text-sm"
                >
                  <MailIcon className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="truncate max-w-[160px] text-xs">
                    {p.pending_email}
                  </span>
                  {amount && amount > 0 && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatNumber(p.computed_amount)} {currencySymbol}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(key)}
                    className="p-0.5 rounded-full hover:bg-destructive/10 transition-colors flex-shrink-0"
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

      {/* Add by email — collapsible */}
      <div>
        {!showEmailInput ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowEmailInput(true)}
          >
            <UserPlusIcon className="h-3.5 w-3.5" />
            {t("expenses.addByEmail")}
          </Button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onKeyDown={handleEmailKeyDown}
                className="h-9 flex-1 text-sm"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-3 flex-shrink-0"
                onClick={handleAddByEmail}
              >
                {t("expenses.add")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2 flex-shrink-0"
                onClick={() => {
                  setShowEmailInput(false);
                  setEmailInput("");
                  setEmailError("");
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>
        )}
      </div>

      {/* Manual split inputs for exact/percentage */}
      {splitMethod !== "equal" && participants.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">
            {splitMethod === "exact"
              ? t("expenses.enterAmounts")
              : t("expenses.enterPercentages")}
          </label>
          <div className="space-y-2">
            {participants.map((participant) => {
              const key = getKey(participant);
              const avatarUrl = getAvatarUrl(participant);
              const displayName = getDisplayName(participant);
              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 sm:w-32 min-w-0",
                      isPending(participant) &&
                        "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {isPending(participant) ? (
                      <div className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                        <MailIcon className="h-3 w-3" />
                      </div>
                    ) : (
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-sm truncate">{displayName}</span>
                  </div>
                  <div className="flex-1 relative min-w-0">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step={splitMethod === "exact" ? "0.01" : "1"}
                      min="0"
                      max={splitMethod === "percentage" ? "100" : undefined}
                      placeholder="0"
                      value={
                        manualValues[key] || participant.split_value || ""
                      }
                      onChange={(e) =>
                        handleManualValueChange(key, e.target.value)
                      }
                      onKeyDown={handleInputKeyDown}
                      className="pr-10 h-9 w-full"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {splitMethod === "percentage" ? "%" : currencySymbol}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground sm:w-20 text-left sm:text-right min-w-0">
                    = {formatNumber(participant.computed_amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total split summary */}
      {participants.length > 0 && amount && (
        <div
          className={cn(
            "flex justify-between items-center p-3 rounded-lg",
            "bg-muted/50 border",
            Math.abs(totalSplit - amount) > 1 &&
              splitMethod !== "equal" &&
              "border-destructive bg-destructive/10"
          )}
        >
          <span className="font-semibold text-sm">
            {t("expenses.totalSplit")}
          </span>
          <span
            className={cn(
              "font-bold tabular-nums",
              Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal"
                ? "text-destructive"
                : "text-primary"
            )}
          >
            {formatNumber(totalSplit)} {currencySymbol}
          </span>
        </div>
      )}

      {Math.abs(totalSplit - (amount || 0)) > 1 &&
        splitMethod !== "equal" &&
        amount && (
          <p className="text-sm text-destructive flex items-start gap-2">
            <span>⚠️</span>
            <span>
              {t("expenses.splitMismatch", {
                splitAmount: `${formatNumber(totalSplit)} ${currencySymbol}`,
                expenseAmount: `${formatNumber(amount)} ${currencySymbol}`,
              })}
            </span>
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
