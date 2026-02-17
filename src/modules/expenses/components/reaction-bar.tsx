import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmilePlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ReactionSummary, ReactionType } from "../types/comments";

interface ReactionBarProps {
  reactions: ReactionSummary[];
  reactionTypes: ReactionType[];
  onToggle: (reactionTypeId: string) => void;
  size?: "sm" | "md";
}

export const ReactionBar = memo(({
  reactions,
  reactionTypes,
  onToggle,
  size = "sm",
}: ReactionBarProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleToggle = (reactionTypeId: string) => {
    onToggle(reactionTypeId);
    setPickerOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <Tooltip key={r.reaction_type_id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onToggle(r.reaction_type_id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors cursor-pointer",
                r.user_reacted
                  ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                  : "border-border bg-muted/50 hover:bg-muted hover:border-primary/30",
                size === "sm" ? "text-xs" : "text-sm"
              )}
              aria-label={`${r.label} (${r.count})`}
            >
              {r.media_type === "emoji" && r.emoji ? (
                <span>{r.emoji}</span>
              ) : r.image_url ? (
                <img src={r.image_url} alt={r.label} className="h-3.5 w-3.5 rounded" />
              ) : null}
              <span className="font-medium">{r.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-48">
            <p className="text-xs">
              {r.users.map((u) => u.full_name).join(", ")}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("rounded-full", size === "sm" ? "h-6 w-6" : "h-7 w-7")}
            aria-label="Add reaction"
          >
            <SmilePlusIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-auto p-2">
          <div className="flex flex-wrap gap-1 max-w-[240px]">
            {reactionTypes.map((rt) => {
              const existing = reactions.find((r) => r.reaction_type_id === rt.id);
              return (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => handleToggle(rt.id)}
                  className={cn(
                    "p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer text-lg",
                    existing?.user_reacted && "bg-primary/10 ring-1 ring-primary/30"
                  )}
                  title={rt.label}
                >
                  {rt.media_type === "emoji" && rt.emoji ? (
                    rt.emoji
                  ) : rt.image_url ? (
                    <img src={rt.image_url} alt={rt.label} className="h-5 w-5 rounded" />
                  ) : (
                    rt.label
                  )}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});

ReactionBar.displayName = "ReactionBar";
