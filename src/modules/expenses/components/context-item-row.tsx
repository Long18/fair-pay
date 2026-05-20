import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

const PALETTE = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
] as const;

function getAvatarColor(seed: string): string {
  const hash = seed
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function getInitials(name = ""): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type ContextItemRowProps = {
  name: string;
  type: "group" | "friend";
  avatarUrl?: string;
  onClick: () => void;
};

export function ContextItemRow({
  name,
  type,
  avatarUrl,
  onClick,
}: ContextItemRowProps) {
  const initials = getInitials(name);
  const colorClass = type === "group" ? getAvatarColor(name) : undefined;

  return (
    <Item
      asChild
      size="sm"
      className="w-full cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/50"
    >
      <button type="button" onClick={onClick}>
        <ItemMedia>
          <Avatar className="size-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback
              className={cn("text-xs font-semibold", colorClass)}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{name}</ItemTitle>
        </ItemContent>
        <ItemActions>
          <ChevronRight className="size-4 text-muted-foreground/40" />
        </ItemActions>
      </button>
    </Item>
  );
}
