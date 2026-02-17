import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmilePlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { EmojiPickerPopover } from "./emoji-picker-popover";
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

  // Match emoji from picker back to a reaction_type by code or emoji char
  const handlePickerSelect = useCallback((emoji: { id: string; native?: string; src?: string }) => {
    // Try matching by code (custom reactions)
    const byCode = reactionTypes.find((rt) => rt.code === emoji.id);
    if (byCode) {
      onToggle(byCode.id);
      setPickerOpen(false);
      return;
    }
    // Try matching by native emoji character
    if (emoji.native) {
      const byEmoji = reactionTypes.find((rt) => rt.emoji === emoji.native);
      if (byEmoji) {
        onToggle(byEmoji.id);
        setPickerOpen(false);
        return;
      }
    }
    // No matching reaction_type — could extend later to support arbitrary emoji
    setPickerOpen(false);
  }, [reactionTypes, onToggle]);

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

      <EmojiPickerPopover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        customReactions={reactionTypes}
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", size === "sm" ? "h-6 w-6" : "h-7 w-7")}
          aria-label="Add reaction"
        >
          <SmilePlusIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      </EmojiPickerPopover>
    </div>
  );
});

ReactionBar.displayName = "ReactionBar";
