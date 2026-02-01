import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  UserPlusIcon,
  XIcon,
  CheckIcon,
  UsersIcon,
  MailIcon,
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

export const ParticipantChips: React.FC<ParticipantChipsProps> = ({
  members,
  participants,
  availableMembers,
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

  // Stable key for a participant: user_id or pending_email
  const getKey = (p: Participant): string => p.user_id || p.pending_email || "";

  const handleManualValueChange = (key: string, value: string) => {
    setManualValues(prev => ({ ...prev, [key]: value }));
    const numValue = parseFloat(value) || 0;
    onSplitValueChange(key, numValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.full_name || t("expenses.unknown");
  };

  const getDisplayName = (p: Participant): string => {
    if (p.user_id) return getMemberName(p.user_id);
    return p.pending_email || t("expenses.unknown");
  };

  const isCurrentUser = (p: Participant) => !!p.user_id && p.user_id === currentUserId;
  const isPending = (p: Participant) => !!p.pending_email && !p.user_id;

  const currencySymbol = currency === "VND" ? "₫" : currency === "USD" ? "$" : "€";

  const handleAddByEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (participants.some(p => p.pending_email === normalized)) {
      setEmailError(t("expenses.emailAlreadyAdded"));
      return;
    }

    onAddParticipantByEmail(normalized);
    setEmailInput("");
    setEmailError("");
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddByEmail();
    }
  };

  return (
    <div className="space-y-4 overflow-x-hidden max-w-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">{t("expenses.participants")}</label>
          <span className="text-xs text-muted-foreground">
            {participants.length} {t("expenses.selected")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-hidden">
          {participants.map((participant) => {
            const key = getKey(participant);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg border bg-background max-w-full",
                  isCurrentUser(participant) && "border-primary/50 bg-primary/5",
                  isPending(participant) && "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/30"
                )}
              >
                {isPending(participant) && (
                  <MailIcon className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                )}
                <span className="text-sm font-medium truncate min-w-0">
                  {getDisplayName(participant)}
                </span>
                {isCurrentUser(participant) && (
                  <Badge variant="outline" className="h-5 px-1 text-[10px] flex-shrink-0">{t("common.you")}</Badge>
                )}
                {isPending(participant) && (
                  <Badge variant="outline" className="h-5 px-1 text-[10px] flex-shrink-0 border-amber-400 text-amber-600 dark:text-amber-400">
                    {t("expenses.pending")}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground mx-1 flex-shrink-0">•</span>
                <span className="text-sm font-medium text-primary truncate min-w-0">
                  {formatNumber(participant.computed_amount)} {currencySymbol}
                </span>
                {!isCurrentUser(participant) && participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(key)}
                    className="ml-1 p-0.5 rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <XIcon className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            );
          })}

          {availableMembers.length > 0 && (
            <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-[38px] border-dashed">
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  {t("expenses.add")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("common.search")} />
                  <CommandEmpty>{t("groups.noGroups")}</CommandEmpty>
                  <CommandGroup>
                    {availableMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.full_name}
                        onSelect={() => {
                          onAddParticipant(member.id);
                          setIsAddOpen(false);
                        }}
                      >
                        <CheckIcon className="mr-2 h-4 w-4 opacity-0" />
                        {member.full_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Email input for adding participants by email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <MailIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {t("expenses.addByEmail")}
        </label>
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
            className="h-9 flex-1"
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
        </div>
        {emailError && (
          <p className="text-xs text-destructive">{emailError}</p>
        )}
      </div>

      {splitMethod !== "equal" && participants.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">
            {splitMethod === "exact" ? t("expenses.enterAmounts") : t("expenses.enterPercentages")}
          </label>
          <div className="space-y-2">
            {participants.map((participant) => {
              const key = getKey(participant);
              return (
                <div key={key} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <span className={cn(
                    "text-sm sm:w-28 truncate min-w-0 flex items-center gap-1",
                    isPending(participant) && "text-amber-600 dark:text-amber-400"
                  )}>
                    {isPending(participant) && <MailIcon className="h-3 w-3 flex-shrink-0" />}
                    {getDisplayName(participant)}
                  </span>
                  <div className="flex-1 relative min-w-0">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step={splitMethod === "exact" ? "0.01" : "1"}
                      min="0"
                      max={splitMethod === "percentage" ? "100" : undefined}
                      placeholder="0"
                      value={manualValues[key] || participant.split_value || ""}
                      onChange={(e) => handleManualValueChange(key, e.target.value)}
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

      {participants.length > 0 && amount && (
        <div className={cn(
          "flex justify-between items-center p-3 rounded-lg",
          "bg-muted/50 border",
          Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && "border-destructive bg-destructive/10"
        )}>
          <span className="font-semibold text-sm">{t("expenses.totalSplit")}</span>
          <span className={cn(
            "font-bold",
            Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" ? "text-destructive" : "text-primary"
          )}>
            {formatNumber(totalSplit)} {currencySymbol}
          </span>
        </div>
      )}

      {amount && Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && (
        <p className="text-sm text-destructive flex items-start gap-2">
          <span>⚠️</span>
          <span>
            {t("expenses.splitMismatch", {
              splitAmount: `${formatNumber(totalSplit)} ${currencySymbol}`,
              expenseAmount: `${formatNumber(amount)} ${currencySymbol}`
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
