import type { RelationOne } from "./utils";

export interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  member_count: number;
  total_expenses: number;
  is_archived: boolean;
  created_at: string;
}

export interface FriendshipRow {
  id: string;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

export interface InviteEmailResponse {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

export interface CreateUserFormValues {
  full_name: string;
  email: string;
  role: "admin" | "moderator" | "user";
  avatar_url?: string;
}

export type GroupMemberWithGroup = {
  role: string | null;
  groups?: RelationOne<{ id: string | null; name: string | null }>;
};

export type GroupMemberWithProfile = {
  role: string | null;
  profiles?: RelationOne<{ id: string | null; full_name: string | null; avatar_url: string | null }>;
};

export type GroupExpensePreview = {
  id: string;
  description: string | null;
  amount: number | null;
  expense_date: string;
  profiles?: RelationOne<{ full_name: string | null }>;
};

export type GroupListRecord = {
  id: string;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  total_expenses: number | null;
  is_archived: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  group_members?: Array<{ count: number | null }> | null;
};

export type FriendshipListRecord = {
  id: string;
  user_a: string;
  user_b: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  user_a_profile?: RelationOne<{ full_name: string | null; avatar_url: string | null }>;
  user_b_profile?: RelationOne<{ full_name: string | null; avatar_url: string | null }>;
};
