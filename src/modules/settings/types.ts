export type Theme = 'light' | 'dark' | 'system';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type ProfileVisibility = 'public' | 'friends' | 'private';

export interface UserSettings {
  user_id: string;

  // Display preferences
  default_currency: string;
  date_format: DateFormat;
  number_format: string;
  theme: Theme;

  // Notification preferences
  notifications_enabled: boolean;
  email_notifications: boolean;
  notify_on_expense_added: boolean;
  notify_on_payment_received: boolean;
  notify_on_friend_request: boolean;
  notify_on_group_invite: boolean;

  // Privacy settings
  allow_friend_requests: boolean;
  allow_group_invites: boolean;
  profile_visibility: ProfileVisibility;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface UserSettingsFormValues {
  // Display preferences
  default_currency: string;
  date_format: DateFormat;
  number_format: string;
  theme: Theme;

  // Notification preferences
  notifications_enabled: boolean;
  email_notifications: boolean;
  notify_on_expense_added: boolean;
  notify_on_payment_received: boolean;
  notify_on_friend_request: boolean;
  notify_on_group_invite: boolean;

  // Privacy settings
  allow_friend_requests: boolean;
  allow_group_invites: boolean;
  profile_visibility: ProfileVisibility;
}

export const CURRENCIES = [
  { value: 'VND', label: 'Vietnamese Dong (₫)', symbol: '₫' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
] as const;

export const DATE_FORMATS: { value: DateFormat; label: string; example: string }[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '25/12/2025' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/25/2025' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2025-12-25' },
];

export const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: 'light', label: 'Sáng', description: 'Luôn sử dụng giao diện sáng' },
  { value: 'dark', label: 'Tối', description: 'Luôn sử dụng giao diện tối' },
  { value: 'system', label: 'Hệ thống', description: 'Theo cài đặt hệ thống' },
];

export const PROFILE_VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Công khai', description: 'Mọi người đều có thể xem hồ sơ của bạn' },
  { value: 'friends', label: 'Bạn bè', description: 'Chỉ bạn bè có thể xem hồ sơ của bạn' },
  { value: 'private', label: 'Riêng tư', description: 'Chỉ bạn có thể xem hồ sơ của bạn' },
];
