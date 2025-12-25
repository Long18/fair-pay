export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormValues {
  full_name: string;
  avatar_url?: string;
}
