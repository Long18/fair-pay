import { memo, useMemo, useCallback } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import { parseThemeVariant } from "@/lib/theme-palettes";
import type { ReactionType } from "../types/comments";

interface EmojiSelectEvent {
  id: string;
  name: string;
  native?: string;
  src?: string;
  shortcodes?: string;
  unified?: string;
}

interface EmojiPickerPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: EmojiSelectEvent) => void;
  customReactions?: ReactionType[];
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export const EmojiPickerPopover = memo(({
  open,
  onOpenChange,
  onSelect,
  customReactions = [],
  children,
  side = "top",
  align = "start",
}: EmojiPickerPopoverProps) => {
  const { themeVariant } = useTheme();

  const resolvedTheme = useMemo(() => {
    const { mode } = parseThemeVariant(themeVariant);
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode;
  }, [themeVariant]);

  // Build custom emoji-mart category from DB reaction_types
  const customEmojis = useMemo(() => {
    const activeCustom = customReactions.filter((r) => r.is_active);
    if (activeCustom.length === 0) return undefined;

    return [
      {
        id: "custom-reactions",
        name: "Custom",
        emojis: activeCustom.map((r) => ({
          id: r.code,
          name: r.label,
          keywords: [r.code, r.label.toLowerCase()],
          skins: r.media_type === "emoji" && r.emoji
            ? [{ native: r.emoji }]
            : r.image_url
              ? [{ src: r.image_url }]
              : [{ native: "⭐" }],
        })),
      },
    ];
  }, [customReactions]);

  const handleEmojiSelect = useCallback((emoji: EmojiSelectEvent) => {
    onSelect(emoji);
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-auto p-0 border-0 shadow-xl rounded-xl overflow-hidden"
        sideOffset={8}
      >
        <Picker
          data={emojiData}
          onEmojiSelect={handleEmojiSelect}
          theme={resolvedTheme}
          custom={customEmojis}
          set="native"
          previewPosition="none"
          skinTonePosition="search"
          maxFrequentRows={2}
          perLine={8}
          emojiSize={28}
          emojiButtonSize={36}
          navPosition="top"
          searchPosition="sticky"
          dynamicWidth={false}
        />
      </PopoverContent>
    </Popover>
  );
});

EmojiPickerPopover.displayName = "EmojiPickerPopover";
