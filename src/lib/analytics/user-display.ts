// src/lib/analytics/user-display.ts
// Stores current user display metadata for analytics auto-attachment

export interface UserDisplayMetadata {
  user_id: string;
  user_display_name: string;
  user_avatar_url: string | null;
  user_role: string;
  user_role_badge: string;
  user_role_label: string;
}

let currentUserDisplay: UserDisplayMetadata | null = null;

export function setUserDisplay(metadata: UserDisplayMetadata): void {
  currentUserDisplay = metadata;
}

export function getUserDisplay(): UserDisplayMetadata | null {
  return currentUserDisplay;
}

export function clearUserDisplay(): void {
  currentUserDisplay = null;
}
