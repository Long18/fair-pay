export type ShareMethod = "platform" | "copy_link" | "native_share";

export type SharePlatformKey =
  | "facebook"
  | "messenger"
  | "zalo"
  | "whatsapp"
  | "telegram"
  | "x"
  | "email"
  | "sms"
  | "copy_link"
  | "native_share";

export interface UtmPlatform {
  platform_key: SharePlatformKey | string;
  label: string;
  source: string;
  medium: string;
  method: ShareMethod;
  intent_url_template: string | null;
  icon_key: string | null;
  enabled: boolean;
  display_order: number;
}

export interface UtmShareTemplate {
  template_key: string;
  entity_type: string;
  entry_point: string;
  campaign: string;
  content: string;
  allowed_platforms: string[];
  default_platform: string | null;
  enabled: boolean;
}

export interface UtmShareConfig {
  platforms: UtmPlatform[];
  templates: UtmShareTemplate[];
}

export const DEFAULT_UTM_PLATFORMS: UtmPlatform[] = [
  {
    platform_key: "facebook",
    label: "Facebook",
    source: "facebook",
    medium: "social_share",
    method: "platform",
    intent_url_template: "https://www.facebook.com/sharer/sharer.php?u={url}",
    icon_key: "facebook",
    enabled: true,
    display_order: 10,
  },
  {
    platform_key: "whatsapp",
    label: "WhatsApp",
    source: "whatsapp",
    medium: "social_share",
    method: "platform",
    intent_url_template: "https://wa.me/?text={text}%20{url}",
    icon_key: "whatsapp",
    enabled: true,
    display_order: 20,
  },
  {
    platform_key: "telegram",
    label: "Telegram",
    source: "telegram",
    medium: "social_share",
    method: "platform",
    intent_url_template: "https://t.me/share/url?url={url}&text={text}",
    icon_key: "telegram",
    enabled: true,
    display_order: 30,
  },
  {
    platform_key: "x",
    label: "X",
    source: "x",
    medium: "social_share",
    method: "platform",
    intent_url_template: "https://twitter.com/intent/tweet?url={url}&text={text}",
    icon_key: "x",
    enabled: true,
    display_order: 40,
  },
  {
    platform_key: "email",
    label: "Email",
    source: "email",
    medium: "direct_share",
    method: "platform",
    intent_url_template: "mailto:?subject={title}&body={text}%0A{url}",
    icon_key: "email",
    enabled: true,
    display_order: 50,
  },
  {
    platform_key: "sms",
    label: "SMS",
    source: "sms",
    medium: "direct_share",
    method: "platform",
    intent_url_template: "sms:?&body={text}%20{url}",
    icon_key: "sms",
    enabled: true,
    display_order: 60,
  },
  {
    platform_key: "messenger",
    label: "Messenger",
    source: "messenger",
    medium: "social_share",
    method: "platform",
    intent_url_template: null,
    icon_key: "messenger",
    enabled: false,
    display_order: 70,
  },
  {
    platform_key: "zalo",
    label: "Zalo",
    source: "zalo",
    medium: "social_share",
    method: "platform",
    intent_url_template: null,
    icon_key: "zalo",
    enabled: false,
    display_order: 80,
  },
  {
    platform_key: "copy_link",
    label: "Copy link",
    source: "unknown",
    medium: "copy_link",
    method: "copy_link",
    intent_url_template: null,
    icon_key: "copy",
    enabled: true,
    display_order: 900,
  },
  {
    platform_key: "native_share",
    label: "Native share",
    source: "unknown",
    medium: "social_share",
    method: "native_share",
    intent_url_template: null,
    icon_key: "share",
    enabled: true,
    display_order: 910,
  },
];

export const DEFAULT_UTM_SHARE_TEMPLATES: UtmShareTemplate[] = [
  {
    template_key: "expense_detail_share_button",
    entity_type: "expense",
    entry_point: "expense_detail_share_button",
    campaign: "expense_share",
    content: "expense_detail_share_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
  {
    template_key: "expense_summary_share_button",
    entity_type: "expense",
    entry_point: "expense_summary_share_button",
    campaign: "expense_share",
    content: "expense_summary_share_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
  {
    template_key: "debt_detail_share_button",
    entity_type: "debt",
    entry_point: "debt_detail_share_button",
    campaign: "debt_share",
    content: "debt_detail_share_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
  {
    template_key: "friend_detail_share_button",
    entity_type: "friend",
    entry_point: "friend_detail_share_button",
    campaign: "friend_invite",
    content: "friend_detail_share_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
  {
    template_key: "group_detail_invite_button",
    entity_type: "group",
    entry_point: "group_detail_invite_button",
    campaign: "group_invite",
    content: "group_detail_invite_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
  {
    template_key: "profile_header_share_button",
    entity_type: "profile",
    entry_point: "profile_header_share_button",
    campaign: "profile_share",
    content: "profile_header_share_button",
    allowed_platforms: ["facebook", "whatsapp", "telegram", "x", "email", "sms", "copy_link", "native_share"],
    default_platform: "facebook",
    enabled: true,
  },
];

export const DEFAULT_UTM_SHARE_CONFIG: UtmShareConfig = {
  platforms: DEFAULT_UTM_PLATFORMS,
  templates: DEFAULT_UTM_SHARE_TEMPLATES,
};

export function sortUtmPlatforms(platforms: UtmPlatform[]) {
  return [...platforms].sort((a, b) => a.display_order - b.display_order || a.label.localeCompare(b.label));
}

export function findUtmPlatform(platforms: UtmPlatform[], platformKey: string | null | undefined) {
  if (!platformKey) return null;
  return platforms.find((platform) => platform.platform_key === platformKey) ?? null;
}

export function findUtmTemplate(templates: UtmShareTemplate[], templateKey: string | null | undefined) {
  if (!templateKey) return null;
  return templates.find((template) => template.template_key === templateKey) ?? null;
}
