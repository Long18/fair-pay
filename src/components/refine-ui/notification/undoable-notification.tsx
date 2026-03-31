import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";
import React from "react";
import { useHaptics } from "@/hooks/use-haptics";

type UndoableNotificationProps = {
  message: string;
  description?: string;
  undoableTimeout?: number;
  /** Called when user clicks Undo — triggers reverse mutation via UndoManager */
  onUndo?: () => void;
  /** @deprecated Use onUndo instead. Kept for backward compatibility. */
  cancelMutation?: () => void;
  onClose?: () => void;
};

export function UndoableNotification({
  message,
  description,
  undoableTimeout = 10,
  onUndo,
  cancelMutation,
  onClose,
}: UndoableNotificationProps) {
  const t = useTranslate();
  const { tap } = useHaptics();
  const [remaining, setRemaining] = React.useState(undoableTimeout);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          onClose?.();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onClose, undoableTimeout]);

  const handleUndo = () => {
    tap();
    (onUndo ?? cancelMutation)?.();
    onClose?.();
  };

  const progress = (remaining / undoableTimeout) * 100;

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-lg shadow-xl border border-border",
        "min-w-[320px] max-w-md overflow-hidden"
      )}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 mr-4">
          <div className="font-medium text-foreground text-sm">
            {message}
          </div>
          {description && (
            <div className="text-muted-foreground text-sm mt-1">
              {description}
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleUndo}
          className="px-4 py-2 text-sm font-medium rounded-md"
        >
          {t("buttons.undo", "Undo")} ({Math.ceil(remaining)}s)
        </Button>
      </div>
      {/* Countdown progress bar */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

UndoableNotification.displayName = "UndoableNotification";
