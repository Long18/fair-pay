import { memo, useState, useCallback, useMemo } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SmilePlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import type { ReactionSummary, ReactionType } from "../types/comments";

interface ReactionBarProps {
  reactions: ReactionSummary[];
  reactionTypes: ReactionType[];
  onToggle: (reactionTypeId: string) => void;
  onCreateAndToggle?: (emojiMartId: string, nativeEmoji: string, label: string) => void;
  size?: "sm" | "md";
  /** chips = per-type pills (comments); social = stacked summary + React (expense). */
  variant?: "chips" | "social";
}

export const ReactionBar = memo(({
  reactions,
  reactionTypes,
  onToggle,
  onCreateAndToggle,
  size = "sm",
  variant = "chips",
}: ReactionBarProps) => {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { tap } = useHaptics();

  const totalReactionCount = useMemo(
    () => reactions.reduce((sum, r) => sum + r.count, 0),
    [reactions],
  );

  const stackedReactions = useMemo(
    () => [...reactions].sort((a, b) => b.count - a.count).slice(0, 3),
    [reactions],
  );

  const userHasReacted = useMemo(
    () => reactions.some((r) => r.user_reacted),
    [reactions],
  );

  const reactionSummaryLabel = useMemo(() => {
    const names = new Set<string>();
    for (const r of reactions) {
      for (const u of r.users) {
        if (u.full_name) names.add(u.full_name);
      }
    }
    if (names.size === 0) return "";
    return [...names].join(", ");
  }, [reactions]);

  // Match emoji from picker back to a reaction_type by emoji_mart_id, code, or emoji char
  const handlePickerSelect = useCallback((emoji: { id: string; name?: string; native?: string; src?: string }) => {
    // Try matching by emoji_mart_id first (most reliable)
    const byMartId = reactionTypes.find((rt) => rt.emoji_mart_id === emoji.id);
    if (byMartId) {
      onToggle(byMartId.id);
      setPickerOpen(false);
      return;
    }
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
    // No matching reaction_type — auto-create via RPC
    if (onCreateAndToggle && emoji.native) {
      onCreateAndToggle(emoji.id, emoji.native, emoji.name || emoji.id);
    }
    setPickerOpen(false);
  }, [reactionTypes, onToggle, onCreateAndToggle]);

  const pickerTrigger = (
    <EmojiPickerPopover
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      onSelect={handlePickerSelect}
      customReactions={reactionTypes}
    >
      {variant === "social" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 shrink-0 gap-1.5 rounded-full border-border px-3.5 text-sm font-semibold shadow-sm",
            "hover:border-primary/45 hover:bg-primary/5 hover:text-primary",
            userHasReacted
              ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15"
              : "bg-background text-foreground",
          )}
          onClick={() => tap()}
          aria-label={
            userHasReacted
              ? t("expenses.comments.reacted", "Reacted")
              : t("expenses.comments.addReaction", "Add reaction")
          }
        >
          <SmilePlusIcon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          {userHasReacted
            ? t("expenses.comments.reacted", "Reacted")
            : t("expenses.comments.addReaction", "Add reaction")}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", size === "sm" ? "h-6 w-6" : "h-7 w-7")}
          aria-label={t("expenses.comments.addReaction", "Add reaction")}
        >
          <SmilePlusIcon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      )}
    </EmojiPickerPopover>
  );

  if (variant === "social") {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {stackedReactions.length > 0 ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {stackedReactions.map((r, index) => (
                      <button
                        key={r.reaction_type_id}
                        type="button"
                        onClick={() => {
                          tap();
                          onToggle(r.reaction_type_id);
                        }}
                        className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-base leading-none shadow-sm transition-transform hover:z-10 hover:scale-105",
                          index > 0 && "-ml-1.5",
                          r.user_reacted && "ring-1 ring-primary/40",
                        )}
                        aria-label={`${r.label} (${r.count})`}
                      >
                        {r.media_type === "emoji" && r.emoji ? (
                          <span className="text-sm">{r.emoji}</span>
                        ) : r.image_url ? (
                          <img src={r.image_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-56">
                  <p className="text-xs">{reactionSummaryLabel}</p>
                </TooltipContent>
              </Tooltip>
              <span className="text-sm text-muted-foreground tabular-nums">
                {t("expenses.comments.reactionCount", { count: totalReactionCount })}
              </span>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="sm:hidden">
                {t("expenses.comments.tapToReact", "Tap Add reaction to respond")}
              </span>
              <span className="hidden sm:inline">
                {t("expenses.comments.reactPrompt", "Be the first to react")}
              </span>
            </p>
          )}
        </div>
        {pickerTrigger}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((r) => (
        <Tooltip key={r.reaction_type_id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => { tap(); onToggle(r.reaction_type_id); }}
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

      {pickerTrigger}
    </div>
  );
});

ReactionBar.displayName = "ReactionBar";
