export interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  expense_date: string;
  context_type: string;
  group_id: string | null;
  group_name: string | null;
  paid_by_user_id: string;
  paid_by_name: string;
  paid_by_avatar: string | null;
  is_settled: boolean;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  user_id: string;
  user_name: string;
  split_method: string;
  computed_amount: number;
  is_settled: boolean;
  settled_amount: number;
}

export interface PaymentRow {
  id: string;
  from_user_id: string;
  from_user_name: string;
  from_user_avatar: string | null;
  to_user_id: string;
  to_user_name: string;
  to_user_avatar: string | null;
  amount: number;
  currency: string;
  context_type: string;
  group_id: string | null;
  group_name: string | null;
  friendship_id: string | null;
  friendship_name: string | null;
  payment_date: string;
  note: string | null;
  created_at: string;
}

export interface FriendshipOption {
  id: string;
  user_a: string;
  user_b: string;
  user_a_name: string;
  user_b_name: string;
}

export interface PaymentFormPayload {
  context_type: "group" | "friend";
  group_id: string | null;
  friendship_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  payment_date: string;
  note: string;
}

export type GroupOption = { id: string; name: string };
export type ProfileOption = { id: string; full_name: string };

export type FriendshipOptionRecord = {
  id: string;
  user_a: string;
  user_b: string;
  user_a_profile?: RelationOne<{ full_name: string | null }>;
  user_b_profile?: RelationOne<{ full_name: string | null }>;
};

export type ExpenseRecord = {
  id: string;
  description: string | null;
  amount: number | null;
  currency: string | null;
  category: string | null;
  expense_date: string;
  context_type: string;
  group_id: string | null;
  paid_by_user_id: string;
  created_at: string;
  groups?: { name: string | null } | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  expense_splits?: Array<{ is_settled: boolean | null }> | null;
};

export type PaymentRecord = {
  id: string;
  from_user: string;
  to_user: string;
  amount: number | null;
  currency: string | null;
  context_type: string;
  group_id: string | null;
  friendship_id: string | null;
  payment_date: string;
  note: string | null;
  created_at: string;
  from?: { full_name: string | null; avatar_url: string | null } | null;
  to?: { full_name: string | null; avatar_url: string | null } | null;
  groups?: { name: string | null } | null;
  friendships?: RelationOne<FriendshipOptionRecord>;
};

export type RelationOne<T> = T | T[] | null | undefined;

