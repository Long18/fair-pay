export interface Payment {
  id: string;
  context_type: 'group' | 'friend';
  group_id: string | null;
  friendship_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  payment_date: string;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface PaymentWithProfiles extends Payment {
  from_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  to_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface PaymentFormValues {
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  payment_date: string;
  note?: string;
  context_type: 'group' | 'friend';
  group_id?: string;
  friendship_id?: string;
}

export interface UserBalance {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  balance: number; // Positive = they owe you, Negative = you owe them
}

export interface SimplifiedDebt {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount: number;
}

