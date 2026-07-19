import { useState } from "react";
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
import { ChevronsUpDownIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useAdminTranslation } from "../../i18n";

export function UserSingleCombobox({
  value,
  onChange,
  users,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  users: Array<{ id: string; full_name: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected
            ? <span className="truncate">{selected.full_name}</span>
            : <span className="text-muted-foreground truncate">{placeholder}</span>}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={tAdmin("toolbar.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{tAdmin("common.noData")}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => { onChange(user.id); setOpen(false); }}
                  className="cursor-pointer"
                >
                  <CheckIcon className={cn("mr-2 h-4 w-4 shrink-0", value === user.id ? "opacity-100" : "opacity-0")} />
                  {user.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
