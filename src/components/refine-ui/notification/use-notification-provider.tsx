import type { NotificationProvider } from "@refinedev/core";
import { toast } from "sonner";

export function useNotificationProvider(): NotificationProvider {
  return {
    open: ({ key, type, message, description }) => {
      switch (type) {
        case "success":
          toast.success(message, {
            id: key,
            description,
            richColors: true,
          });
          return;

        case "error":
          toast.error(message, {
            id: key,
            description,
            richColors: true,
          });
          return;

        default:
          return;
      }
    },
    close: (id) => {
      toast.dismiss(id);
    },
  };
}
