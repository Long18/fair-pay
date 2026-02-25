import { useState, useCallback, memo, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CornerDownRightIcon, PencilIcon, Trash2Icon } from "@/components/ui/icons";
import { ReactionBar } from "./reaction-bar";
import { CommentInput } from "./comment-input";
import { MentionProfileCard } from "./mention-profile-card";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import type { ExpenseComment, CommentUser, ReactionSummary, ReactionType } from "../types/comments";

/** Escape special regex characters using loop */
function escapeRegex(str: string): string {
  const special = new Set([".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]);
  let result = "";
  for (const ch of str) {
    if (special.has(ch)) result += "\\" + ch;
    else result += ch;
  }
  return result;
}

interface CommentItemProps {
  comment: ExpenseComment;
  currentUserId: string | undefined;
  currentUser: CommentUser | null;
  participants: CommentUser[];
  reactions: ReactionSummary[];
  reactionTypes: ReactionType[];
  onToggleReaction: (reactionTypeId: string) => void;
  onCreateAndToggleReaction?: (emojiMartId: string, nativeEmoji: string, label: string) => void;
  onReply: (content: string, mentionedUserIds: string[]) => Promise<unknown>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  isReply?: boolean;
  getReactionsForComment?: (commentId: string) => ReactionSummary[];
  onToggleReplyReaction?: (commentId: string, reactionTypeId: string) => void;
  onCreateAndToggleReplyReaction?: (commentId: string, emojiMartId: string, nativeEmoji: string, label: string) => void;
}

export const CommentItem = memo(({
  comment,
  currentUserId,
  currentUser,
  participants,
  reactions,
  reactionTypes,
  onToggleReaction,
  onCreateAndToggleReaction,
  onReply,
  onUpdate,
  onDelete,
  isSubmitting,
  isReply = false,
  getReactionsForComment,
  onToggleReplyReaction,
  onCreateAndToggleReplyReaction,
}: CommentItemProps) => {
  const { t, i18n } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const dateLocale = i18n.language === "vi" ? vi : enUS;
  const isOwn = comment.user_id === currentUserId;

  const initials = comment.user.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: dateLocale,
  });

  const handleSaveEdit = useCallback(async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setEditing(false);
      return;
    }
    await onUpdate(comment.id, trimmed);
    setEditing(false);
  }, [editContent, comment.id, comment.content, onUpdate]);

  const handleReply = useCallback(async (content: string, mentionedUserIds: string[]) => {
    await onReply(content, mentionedUserIds);
    setReplying(false);
  }, [onReply]);

  const renderContent = (text: string) => {
    const mentionNames = comment.mentions
      .map((m) => m.full_name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const escapedNames = mentionNames.map((name) => escapeRegex(name));

    const mentionAlternatives = escapedNames.length > 0
      ? `@(?:${escapedNames.join("|")}|all|here)|@\\S+`
      : `@\\S+`;

    const pattern = new RegExp(`(${mentionAlternatives}|:[a-z0-9_+-]+:)`, "g");
    const parts = text.split(pattern);

    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return <span key={i} className="text-primary font-medium">{part}</span>;
      }
      const shortcodeMatch = part.match(/^:([a-z0-9_+-]+):$/);
      if (shortcodeMatch) {
        const code = shortcodeMatch[1];
        const rt = reactionTypes.find(
          (r) => r.code === code || r.emoji_mart_id === code
        );
        if (rt) {
          if (rt.media_type === "emoji" && rt.emoji) {
            return <span key={i}>{rt.emoji}</span>;
          }
          if (rt.image_url) {
            return (
              <img
                key={i}
                src={rt.image_url}
                alt={rt.label}
                className="inline-block h-5 w-5 align-text-bottom rounded"
              />
            );
          }
        }
        return <span key={i}>{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("group", isReply && "ml-8 md:ml-10")}>
      <div className="flex gap-2.5">
        <Avatar className={cn("shrink-0", isReply ? "h-6 w-6" : "h-8 w-8")}>
          <AvatarImage src={comment.user.avatar_url || undefined} alt={comment.user.full_name} />
          <AvatarFallback className={cn(isReply ? "text-[10px]" : "text-xs")}>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{comment.user.full_name}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
            {comment.is_edited && (
              <span className="text-xs text-muted-foreground italic">
                ({t("expenses.comments.edited", "edited")})
              </span>
            )}
          </div>

          {editing ? (
            <div className="mt-1.5 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                  if (e.key === "Escape") setEditing(false);
                }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleSaveEdit}>
                  {t("common.save", "Save")}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                  {t("common.cancel", "Cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{renderContent(comment.content)}</p>
          )}

          {!editing && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <ReactionBar
                reactions={reactions}
                reactionTypes={reactionTypes}
                onToggle={onToggleReaction}
                onCreateAndToggle={onCreateAndToggleReaction}
                size="sm"
              />
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setReplying(!replying)}
                >
                  <CornerDownRightIcon className="h-3 w-3 mr-1" />
                  {t("expenses.comments.reply", "Reply")}
                </Button>
              )}
              {isOwn && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setEditing(true); setEditContent(comment.content); }}
                    aria-label={t("common.edit", "Edit")}
                  >
                    <PencilIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDelete(comment.id)}
                    aria-label={t("common.delete", "Delete")}
                  >
                    <Trash2Icon className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-2">
              <CommentInput
                currentUser={currentUser}
                participants={participants}
                onSubmit={handleReply}
                isSubmitting={isSubmitting}
                placeholder={t("expenses.comments.replyPlaceholder", "Write a reply...")}
                autoFocus
                compact
                customReactions={reactionTypes}
              />
            </div>
          )}

          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUser={currentUser}
                  participants={participants}
                  reactions={getReactionsForComment?.(reply.id) || []}
                  reactionTypes={reactionTypes}
                  onToggleReaction={(rtId) => onToggleReplyReaction?.(reply.id, rtId)}
                  onCreateAndToggleReaction={(emojiMartId, nativeEmoji, label) => onCreateAndToggleReplyReaction?.(reply.id, emojiMartId, nativeEmoji, label)}
                  onReply={onReply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isSubmitting={isSubmitting}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CommentItem.displayName = "CommentItem";
