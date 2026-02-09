export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  simplify_debts: boolean;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  members?: GroupMember[];
  member_count?: number;
}

export interface GroupFormValues {
  name: string;
  description?: string;
  simplify_debts?: boolean;
  member_ids?: string[];
}

export interface AddMemberFormValues {
  user_id: string;
  role: 'admin' | 'member';
}
