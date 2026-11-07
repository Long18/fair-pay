import { useGetIdentity } from "@refinedev/core";
import { useNotificationPreviewBurst } from "../hooks/use-notification-preview-burst";

/**
 * Ensures in-app preview toasts run for the whole app shell (not only when
 * {@link NotificationPanel} subtree is focused). Pairs with {@link NotificationInAppPreviewHost}.
 */
export function NotificationPreviewBurstSubscription() {
  const { data: identity } = useGetIdentity<{ id: string }>();
  useNotificationPreviewBurst({ enabled: Boolean(identity?.id) });
  return null;
}
