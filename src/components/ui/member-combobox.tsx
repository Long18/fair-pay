import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "@/components/ui/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface Member {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface MemberComboboxProps {
  members: Member[];
  selectedIds: string[];
  onSelect: (memberId: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  currentUserId?: string;
}

export function MemberCombobox({
  members,
  selectedIds,
  onSelect,
  placeholder = "Search members...",
  emptyMessage = "No member found.",
  currentUserId,
}: MemberComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const availableMembers = members.filter(
    (m) => !selectedIds.includes(m.id)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4 opacity-50" />
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {availableMembers.map((member) => {
                const getInitials = (name: string) => {
                  return name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";
                };

                return (
                  <CommandItem
                    key={member.id}
                    value={member.full_name}
                    onSelect={() => {
                      onSelect(member.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <CheckIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        selectedIds.includes(member.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage
                        src={member.avatar_url || undefined}
                        alt={member.full_name}
                      />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{member.full_name}</span>
                    {member.id === currentUserId && (
                      <span className="text-xs text-muted-foreground">(You)</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
