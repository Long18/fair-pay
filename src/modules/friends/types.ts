export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  user_a: string;
  user_b: string;
  status: FriendshipStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FriendshipWithProfiles extends Friendship {
  user_a_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  user_b_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Friend {
  friendship_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  status: FriendshipStatus;
  created_at: string;
  is_requester: boolean;
}

export interface AddFriendFormValues {
  email: string;
}

