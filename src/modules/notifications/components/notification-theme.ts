import type { ComponentType } from "react";
import { themeIntentTones, type ThemeIntent } from "@/lib/theme-intents";
import { Notification } from "../types";
import {
  ReceiptIcon,
  HandCoinsIcon,
  UserPlusIcon,
  UsersIcon,
  Trash2Icon,
  PencilIcon,
  LogInIcon,
  UserCheckIcon,
  XIcon,
  MessageSquareIcon,
  AtSignIcon,
} from "@/components/ui/icons";

type NotificationIcon = ComponentType<{ className?: string }>;

export type NotificationMeta = {
  icon: NotificationIcon;
  tone: ThemeIntent;
};

const notificationMetaByType: Record<Notification["type"], NotificationMeta> = {
  expense_added: { icon: ReceiptIcon, tone: "accent" },
  payment_recorded: { icon: HandCoinsIcon, tone: "success" },
  friend_request: { icon: UserPlusIcon, tone: "info" },
  friend_accepted: { icon: UsersIcon, tone: "brand" },
  added_to_group: { icon: UsersIcon, tone: "brand" },
  expense_updated: { icon: PencilIcon, tone: "warning" },
  expense_deleted: { icon: Trash2Icon, tone: "danger" },
  group_join_request: { icon: LogInIcon, tone: "warning" },
  group_join_approved: { icon: UserCheckIcon, tone: "success" },
  group_join_rejected: { icon: XIcon, tone: "danger" },
  comment_mention: { icon: AtSignIcon, tone: "info" },
  comment_reply: { icon: MessageSquareIcon, tone: "brand" },
  comment_reaction: { icon: MessageSquareIcon, tone: "accent" },
  expense_comment: { icon: MessageSquareIcon, tone: "info" },
};

const defaultNotificationMeta: NotificationMeta = {
  icon: ReceiptIcon,
  tone: "neutral",
};

export function getNotificationMeta(type: Notification["type"]) {
  const meta = notificationMetaByType[type] ?? defaultNotificationMeta;
  return {
    ...meta,
    colors: themeIntentTones[meta.tone],
  };
}
