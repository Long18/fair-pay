import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationToast } from "./notification-toast";
import type { NotificationPreviewDetail } from "../utils/notification-preview-events";

type Props = {
  detail: NotificationPreviewDetail;
  onActivate: () => void;
  onDismiss: () => void;
};

/** In-app preview card — same shell as pre–Bencho `toast.custom` + {@link NotificationToast}. */
export function NotificationPreviewCard({ detail, onActivate, onDismiss }: Props) {
  return (
    <div
      className={cn(
        "relative w-[min(100vw-2rem,24rem)] rounded-xl border border-border/60 bg-popover p-3 shadow-lg",
        "transition-colors hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        className="w-full cursor-pointer text-left"
        onClick={onActivate}
      >
        <NotificationToast notification={detail.notification} />
      </button>
      <button
        type="button"
        className={cn(
          "absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-label="Dismiss notification preview"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
