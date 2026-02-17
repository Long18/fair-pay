// Comment & Reaction System Types

export interface ReactionType {
  id: string;
  code: string;
  emoji: string | null;
  emoji_mart_id: string | null;
  image_url: string | null;
  media_type: "emoji" | "image" | "gif";
  label: string;
  is_active: boolean;
  sort_order: number;
}

export interface CommentUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface CommentMention {
  user_id: string;
  full_name: string;
}

export interface ExpenseComment {
  id: string;
  expense_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  user: CommentUser;
  mentions: CommentMention[];
  replies?: ExpenseComment[];
}

export interface ReactionSummary {
  reaction_type_id: string;
  code: string;
  emoji: string | null;
  image_url: string | null;
  media_type: "emoji" | "image" | "gif";
  label: string;
  count: number;
  user_reacted: boolean;
  users: CommentUser[];
}

export interface ExpenseAllReactions {
  expense: ReactionSummary[];
  comments: Record<string, ReactionSummary[]>;
}
