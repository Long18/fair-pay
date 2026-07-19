import type { CommentUser, ExpenseComment } from "../types/comments";

type SplitLike = {
  user_id?: string | null;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

type ExpenseLike = {
  profiles?: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

/**
 * Build unique @mention participants from expense payer + splits.
 */
export function buildCommentParticipants(
  expense: ExpenseLike | null | undefined,
  splits: SplitLike[] = [],
): CommentUser[] {
  const users: CommentUser[] = [];
  const seen = new Set<string>();

  const payer = expense?.profiles;
  if (payer?.id && !seen.has(payer.id)) {
    seen.add(payer.id);
    users.push({
      id: payer.id,
      full_name: payer.full_name || "Unknown",
      avatar_url: payer.avatar_url || null,
    });
  }

  for (const split of splits) {
    if (!split.user_id || seen.has(split.user_id)) continue;
    seen.add(split.user_id);
    users.push({
      id: split.user_id,
      full_name: split.profiles?.full_name || "Unknown",
      avatar_url: split.profiles?.avatar_url || null,
    });
  }

  return users;
}

/** Count root comments + one-level replies. */
export function countCommentThread(comments: ExpenseComment[]): number {
  return comments.reduce(
    (acc, comment) => acc + 1 + (comment.replies?.length ?? 0),
    0,
  );
}

/** Flatten root + replies in display order (roots, then each root's replies). */
export function flattenCommentThread(comments: ExpenseComment[]): ExpenseComment[] {
  const out: ExpenseComment[] = [];
  for (const comment of comments) {
    out.push(comment);
    if (comment.replies?.length) {
      out.push(...comment.replies);
    }
  }
  return out;
}
