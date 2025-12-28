import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
            <Search className="h-4 w-4 opacity-50" />
            <span className="text-muted-foreground">{placeholder}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Type to search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {availableMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.full_name}
                  onSelect={() => {
                    onSelect(member.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedIds.includes(member.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {member.full_name}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
