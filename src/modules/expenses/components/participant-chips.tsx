import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/locale-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CommandList,
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

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

  const getMember = (userId: string): Member | undefined => {
    return members.find(m => m.id === userId);
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

  const isCurrentUser = (p: Participant) => !!p.user_id && p.user_id === currentUserId;
  const isPending = (p: Participant) => !!p.pending_email && !p.user_id;
  const isSelected = (memberId: string) => participants.some(p => p.user_id === memberId);

  const currencySymbol = currency === "VND" ? "₫" : currency === "USD" ? "$" : "€";

  const handleToggleMember = (memberId: string) => {
    if (isSelected(memberId)) {
      if (memberId === currentUserId && participants.length <= 1) return;
      onRemoveParticipant(memberId);
    } else {
      onAddParticipant(memberId);
    }
  };

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

        {/* Selected participant chips with avatars */}
        <div className="flex flex-wrap gap-2 overflow-x-hidden">
          {participants.map((participant) => {
            const key = getKey(participant);
            const avatarUrl = getAvatarUrl(participant);
            const displayName = getDisplayName(participant);
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-full border bg-background transition-colors",
                  isCurrentUser(participant) && "border-primary/50 bg-primary/5",
                  isPending(participant) && "border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/30"
                )}
              >
                {isPending(participant) ? (
                  <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <MailIcon className="h-3 w-3 text-amber-500" />
                  </div>
                ) : (
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm font-medium truncate min-w-0 max-w-[100px]">
                  {displayName}
                </span>
                {isCurrentUser(participant) && (
                  <Badge variant="outline" className="h-5 px-1 text-[10px] flex-shrink-0">{t("common.you")}</Badge>
                )}
                {isPending(participant) && (
                  <Badge variant="outline" className="h-5 px-1 text-[10px] flex-shrink-0 border-amber-400 text-amber-600 dark:text-amber-400">
                    {t("expenses.pending")}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                <span className="text-xs font-medium text-primary truncate min-w-0">
                  {formatNumber(participant.computed_amount)} {currencySymbol}
                </span>
                {!isCurrentUser(participant) && participants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveParticipant(key)}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <XIcon className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Multi-select popover — stays open for toggling multiple members */}
          {members.length > 1 && (
            <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-[34px] rounded-full border-dashed gap-1">
                  <UserPlusIcon className="h-4 w-4" />
                  {t("expenses.add")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("common.search")} />
                  <CommandList>
                    <CommandEmpty>{t("groups.noGroups")}</CommandEmpty>
                    <CommandGroup>
                      {members.map((member) => {
                        const selected = isSelected(member.id);
                        const isSelf = member.id === currentUserId;
                        return (
                          <CommandItem
                            key={member.id}
                            value={member.full_name}
                            onSelect={() => handleToggleMember(member.id)}
                            className="cursor-pointer flex items-center gap-2 py-2"
                          >
                            <div className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-sm border flex-shrink-0",
                              selected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            )}>
                              {selected && <CheckIcon className="h-3 w-3" />}
                            </div>
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-sm">{member.full_name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">({t("common.you")})</span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
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
              const avatarUrl = getAvatarUrl(participant);
              const displayName = getDisplayName(participant);
              return (
                <div key={key} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className={cn(
                    "flex items-center gap-2 sm:w-32 min-w-0",
                    isPending(participant) && "text-amber-600 dark:text-amber-400"
                  )}>
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
