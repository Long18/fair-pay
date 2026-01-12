import React, { useState } from "react";
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
} from "@/components/ui/icons";

interface Participant {
  user_id: string;
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
  onRemoveParticipant: (userId: string) => void;
  onSplitValueChange: (userId: string, value: number) => void;
  totalSplit: number;
}

export const ParticipantChips: React.FC<ParticipantChipsProps> = ({
  members,
  participants,
  availableMembers,
  currentUserId,
  splitMethod,
  amount,
  currency,
  onAddParticipant,
  onRemoveParticipant,
  onSplitValueChange,
  totalSplit,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});

  const handleManualValueChange = (userId: string, value: string) => {
    setManualValues(prev => ({ ...prev, [userId]: value }));
    const numValue = parseFloat(value) || 0;
    onSplitValueChange(userId, numValue);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Blur input on Enter to dismiss keyboard on mobile
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const getMemberName = (userId: string) => {
    const member = members.find(m => m.id === userId);
    return member?.full_name || "Unknown";
  };

  const isCurrentUser = (userId: string) => userId === currentUserId;

  const currencySymbol = currency === "VND" ? "₫" : currency === "USD" ? "$" : "€";

  return (
    <div className="space-y-4 overflow-x-hidden max-w-full">
      {/* Selected Participants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Participants</label>
          <span className="text-xs text-muted-foreground">
            {participants.length} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2 overflow-x-hidden">
          {participants.map((participant) => (
            <div
              key={participant.user_id}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-lg border bg-background max-w-full",
                isCurrentUser(participant.user_id) && "border-primary/50 bg-primary/5"
              )}
            >
              <span className="text-sm font-medium truncate min-w-0">
                {getMemberName(participant.user_id)}
              </span>
              {isCurrentUser(participant.user_id) && (
                <Badge variant="outline" className="h-5 px-1 text-[10px] flex-shrink-0">You</Badge>
              )}
              <span className="text-sm text-muted-foreground mx-1 flex-shrink-0">•</span>
              <span className="text-sm font-medium text-primary truncate min-w-0">
                {formatNumber(participant.computed_amount)} {currencySymbol}
              </span>
              {!isCurrentUser(participant.user_id) && participants.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(participant.user_id)}
                  className="ml-1 p-0.5 rounded hover:bg-destructive/10 transition-colors flex-shrink-0"
                >
                  <XIcon className="h-3 w-3 text-destructive" />
                </button>
              )}
            </div>
          ))}

          {/* Add Participant Button */}
          {availableMembers.length > 0 && (
            <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-[38px] border-dashed"
                >
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search..." />
                  <CommandEmpty>No members found</CommandEmpty>
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

      {/* Manual Split Values (for exact/percentage) */}
      {splitMethod !== "equal" && participants.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <label className="text-sm font-medium">
            {splitMethod === "exact" ? "Enter amounts" : "Enter percentages"}
          </label>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div key={participant.user_id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <span className="text-sm sm:w-28 truncate min-w-0">
                  {getMemberName(participant.user_id)}
                </span>
                <div className="flex-1 relative min-w-0">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={splitMethod === "exact" ? "0.01" : "1"}
                    min="0"
                    max={splitMethod === "percentage" ? "100" : undefined}
                    placeholder="0"
                    value={manualValues[participant.user_id] || participant.split_value || ""}
                    onChange={(e) => handleManualValueChange(participant.user_id, e.target.value)}
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
            ))}
          </div>
        </div>
      )}

      {/* Total Summary */}
      {participants.length > 0 && amount && (
        <div className={cn(
          "flex justify-between items-center p-3 rounded-lg",
          "bg-muted/50 border",
          Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && "border-destructive bg-destructive/10"
        )}>
          <span className="font-semibold text-sm">Total Split</span>
          <span className={cn(
            "font-bold",
            Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" ? "text-destructive" : "text-primary"
          )}>
            {formatNumber(totalSplit)} {currencySymbol}
          </span>
        </div>
      )}

      {/* Validation Message */}
      {amount && Math.abs(totalSplit - amount) > 1 && splitMethod !== "equal" && (
        <p className="text-sm text-destructive flex items-start gap-2">
          <span>⚠️</span>
          <span>
            Total split ({formatNumber(totalSplit)} {currencySymbol}) doesn't match
            expense amount ({formatNumber(amount)} {currencySymbol})
          </span>
        </p>
      )}

      {/* Empty State */}
      {participants.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <UsersIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No participants selected</p>
          <p className="text-xs mt-1">Click the Add button to select who shares this expense</p>
        </div>
      )}
    </div>
  );
};
