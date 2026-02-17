import { useState, useRef, useCallback, useMemo, useEffect, memo } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, AtSignIcon, UsersIcon, MessageSquareIcon, SmileIcon } from "@/components/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/utility/supabaseClient";
import { init, SearchIndex } from "emoji-mart";
import emojiData from "@emoji-mart/data";
import { EmojiPickerPopover } from "./emoji-picker-popover";
import type { CommentUser, ReactionType } from "../types/comments";

// Initialize emoji-mart data for SearchIndex
init({ data: emojiData });

// Sentinel UUIDs matching the DB migration
const MENTION_ALL_ID = "00000000-0000-0000-0000-000000000001";
const MENTION_HERE_ID = "00000000-0000-0000-0000-000000000002";

interface CommentInputProps {
  currentUser: CommentUser | null;
  participants: CommentUser[];
  commenters?: CommentUser[];
  onSubmit: (content: string, mentionedUserIds: string[]) => Promise<unknown>;
  isSubmitting: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  customReactions?: ReactionType[];
}

export const CommentInput = memo(({
  currentUser,
  participants,
  commenters = [],
  onSubmit,
  isSubmitting,
  placeholder,
  autoFocus = false,
  compact = false,
  customReactions = [],
}: CommentInputProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [friends, setFriends] = useState<CommentUser[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { data: identity } = useGetIdentity<{ id: string }>();


  // Fetch friends list for @mention outside participants
  useEffect(() => {
    if (!identity?.id) return;
    const fetchFriends = async () => {
      const { data } = await supabaseClient
        .from("friendships")
        .select("user_a, user_b, user_a_profile:profiles!friendships_user_a_fkey(id, full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(id, full_name, avatar_url)")
        .eq("status", "accepted")
        .or(`user_a.eq.${identity.id},user_b.eq.${identity.id}`);
      if (!data) return;
      const participantIds = new Set(participants.map((p) => p.id));
      const friendList: CommentUser[] = [];
      for (const f of data) {
        const isUserA = f.user_a === identity.id;
        const profile = isUserA
          ? (f.user_b_profile as unknown as CommentUser)
          : (f.user_a_profile as unknown as CommentUser);
        if (profile && !participantIds.has(profile.id)) {
          friendList.push(profile);
        }
      }
      setFriends(friendList);
    };
    fetchFriends();
  }, [identity?.id, participants]);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed, Array.from(mentionedIds));
    setContent("");
    setMentionedIds(new Set());
  }, [content, mentionedIds, isSubmitting, onSubmit]);

  // Insert emoji at cursor, replacing the :query text if present
  const insertEmoji = useCallback((native: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart;
      const before = content.substring(0, pos).replace(/:[\w_+-]*$/, "");
      const after = content.substring(pos);
      setContent(before + native + after);
      requestAnimationFrame(() => {
        const newPos = before.length + native.length;
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
        textarea.focus();
      });
    } else {
      setContent((prev) => prev + native);
    }
    setEmojiOpen(false);
  }, [content]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const insertMention = useCallback((id: string, displayName: string) => {
    const mention = `@${displayName} `;
    const textarea = textareaRef.current;
    if (textarea) {
      const pos = textarea.selectionStart;
      const before = content.substring(0, pos).replace(/@[\w\s]*$/, "");
      const after = content.substring(pos);
      setContent(before + mention + after);
    } else {
      setContent((prev) => prev + mention);
    }
    setMentionedIds((prev) => new Set(prev).add(id));
    setMentionOpen(false);
    setMentionFilter("");
    textareaRef.current?.focus();
  }, [content]);

  // Special mention items (@all, @here)
  const specialItems = useMemo(() => {
    const items: Array<{ id: string; label: string; description: string; icon: React.ReactNode }> = [];
    if (participants.length > 1) {
      items.push({
        id: MENTION_ALL_ID,
        label: "@all",
        description: t("expenses.comments.mentionAll", "Tất cả người tham gia"),
        icon: <UsersIcon className="h-4 w-4 text-blue-500" />,
      });
    }
    if (commenters.length > 0) {
      items.push({
        id: MENTION_HERE_ID,
        label: "@here",
        description: t("expenses.comments.mentionHere", "Người đã bình luận"),
        icon: <MessageSquareIcon className="h-4 w-4 text-green-500" />,
      });
    }
    return items;
  }, [participants.length, commenters.length, t]);

  // Filter participants (exclude current user)
  const filteredParticipants = useMemo(() => {
    const lower = mentionFilter.toLowerCase();
    return participants.filter(
      (p) => p.id !== currentUser?.id && (!lower || p.full_name.toLowerCase().includes(lower))
    );
  }, [participants, currentUser?.id, mentionFilter]);

  // Filter friends (exclude current user and participants)
  const filteredFriends = useMemo(() => {
    const lower = mentionFilter.toLowerCase();
    return friends.filter(
      (f) => !lower || f.full_name.toLowerCase().includes(lower)
    );
  }, [friends, mentionFilter]);

  // Filter special items
  const filteredSpecial = useMemo(() => {
    if (!mentionFilter) return specialItems;
    const lower = mentionFilter.toLowerCase();
    return specialItems.filter((s) => s.label.toLowerCase().includes(lower));
  }, [specialItems, mentionFilter]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPos);

    // Auto-replace complete shortcodes like :fire: → 🔥
    const shortcodeMatch = textBeforeCursor.match(/:([a-z0-9_+-]+):$/);
    if (shortcodeMatch) {
      const code = shortcodeMatch[1];

      // First check custom reactions from DB by code or emoji_mart_id
      const customMatch = customReactions.find(
        (r) => r.code === code || r.emoji_mart_id === code
      );
      if (customMatch?.emoji) {
        const native = customMatch.emoji;
        const beforeShortcode = val.substring(0, cursorPos - shortcodeMatch[0].length);
        const afterCursor = val.substring(cursorPos);
        const newVal = beforeShortcode + native + afterCursor;
        setContent(newVal);
        setEmojiOpen(false);
        requestAnimationFrame(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            const newPos = beforeShortcode.length + native.length;
            textarea.selectionStart = newPos;
            textarea.selectionEnd = newPos;
          }
        });
      } else {
        // Fallback to emoji-mart SearchIndex
        SearchIndex.search(code).then((results: Array<{ id: string; skins: Array<{ native?: string }> }>) => {
          const exact = results?.find((r) => r.id === code || r.id === code.replace(/-/g, "_"));
          if (exact?.skins?.[0]?.native) {
            const native = exact.skins[0].native;
            const beforeShortcode = val.substring(0, cursorPos - shortcodeMatch[0].length);
            const afterCursor = val.substring(cursorPos);
            const newVal = beforeShortcode + native + afterCursor;
            setContent(newVal);
            setEmojiOpen(false);
            requestAnimationFrame(() => {
              const textarea = textareaRef.current;
              if (textarea) {
                const newPos = beforeShortcode.length + native.length;
                textarea.selectionStart = newPos;
                textarea.selectionEnd = newPos;
              }
            });
          }
        });
      }
    }

    setContent(val);

    // Detect @mention pattern
    const mentionMatch = textBeforeCursor.match(/@([\w\s]*)$/);
    if (mentionMatch) {
      setMentionOpen(true);
      setMentionFilter(mentionMatch[1].trim());
      setEmojiOpen(false);
    } else {
      setMentionOpen(false);
      setMentionFilter("");

      // Detect : pattern — open emoji picker
      const emojiMatch = textBeforeCursor.match(/:([a-z0-9_+-]{0,})$/);
      if (emojiMatch && !shortcodeMatch) {
        setEmojiOpen(true);
      }
    }
  }, [customReactions]);

  const initials = currentUser?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const hasResults = filteredSpecial.length > 0 || filteredParticipants.length > 0 || filteredFriends.length > 0;

  return (
    <div className={cn("flex gap-2", compact ? "items-center" : "items-start")}>
      {!compact && (
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarImage src={currentUser?.avatar_url || undefined} alt={currentUser?.full_name} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div className="flex-1 relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t("expenses.comments.placeholder", "Write a comment...")}
            autoFocus={autoFocus}
            rows={compact ? 1 : 2}
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              compact ? "pr-16" : "pr-20"
            )}
            aria-label={t("expenses.comments.inputLabel", "Comment input")}
          />
          <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
            <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMentionOpen(true)}
                  aria-label={t("expenses.comments.mention", "Mention someone")}
                >
                  <AtSignIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="end" className="w-56 p-1 max-h-64 overflow-y-auto">
                {!hasResults ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">
                    {t("expenses.comments.noParticipants", "No participants found")}
                  </p>
                ) : (
                  <>
                    {/* Special: @all, @here */}
                    {filteredSpecial.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => insertMention(s.id, s.label)}
                      >
                        {s.icon}
                        <div className="flex flex-col items-start min-w-0">
                          <span className="font-medium text-xs">{s.label}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{s.description}</span>
                        </div>
                      </button>
                    ))}

                    {filteredSpecial.length > 0 && (filteredParticipants.length > 0 || filteredFriends.length > 0) && (
                      <Separator className="my-1" />
                    )}

                    {/* Participants */}
                    {filteredParticipants.length > 0 && (
                      <>
                        <p className="text-[10px] text-muted-foreground px-2 pt-1 pb-0.5 uppercase tracking-wider">
                          {t("expenses.comments.participants", "Participants")}
                        </p>
                        {filteredParticipants.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => insertMention(p.id, p.full_name)}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={p.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {p.full_name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{p.full_name}</span>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Friends (outside participants) */}
                    {filteredFriends.length > 0 && (
                      <>
                        {filteredParticipants.length > 0 && <Separator className="my-1" />}
                        <p className="text-[10px] text-muted-foreground px-2 pt-1 pb-0.5 uppercase tracking-wider">
                          {t("expenses.comments.friends", "Friends")}
                        </p>
                        {filteredFriends.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors cursor-pointer"
                            onClick={() => insertMention(f.id, f.full_name)}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={f.avatar_url || undefined} />
                              <AvatarFallback className="text-[10px]">
                                {f.full_name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{f.full_name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </PopoverContent>
            </Popover>

            {/* Emoji picker — triggered by : or button */}
            <EmojiPickerPopover
              open={emojiOpen}
              onOpenChange={setEmojiOpen}
              onSelect={(emoji) => {
                if (emoji.native) {
                  insertEmoji(emoji.native);
                } else {
                  // Image/GIF custom reaction — insert shortcode
                  insertEmoji(`:${emoji.id}:`);
                }
              }}
              customReactions={customReactions}
              side="top"
              align="end"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEmojiOpen(true)}
                aria-label={t("expenses.comments.emoji", "Emoji")}
              >
                <SmileIcon className="h-3.5 w-3.5" />
              </Button>
            </EmojiPickerPopover>

            <Button
              type="button"
              size="icon"
              className="h-7 w-7"
              disabled={!content.trim() || isSubmitting}
              onClick={handleSubmit}
              aria-label={t("expenses.comments.send", "Send comment")}
            >
              <SendIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

CommentInput.displayName = "CommentInput";
