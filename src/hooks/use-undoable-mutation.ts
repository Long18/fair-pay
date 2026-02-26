import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { UndoableNotification } from "@/components/refine-ui/notification/undoable-notification";
import { createElement } from "react";

const UNDO_TIMEOUT_SECONDS = 10;

interface UndoableMutationOptions<TParams, TResult> {
  mutationFn: (params: TParams) => Promise<TResult>;
  onSuccess?: (result: TResult, params: TParams) => void;
  onError?: (error: Error, params: TParams) => void;
  successMessage?: string | ((params: TParams) => string);
  pendingMessage?: string | ((params: TParams) => string);
  errorMessage?: string | ((params: TParams) => string);
}

/**
 * Wraps any async mutation with a 10-second undoable delay.
 * Shows a toast with an Undo button + countdown progress bar.
 * If the user clicks Undo, the mutation is cancelled before execution.
 */
export function useUndoableMutation<TParams, TResult>(
  options: UndoableMutationOptions<TParams, TResult>
) {
  const pendingRef = useRef<{
    timer: ReturnType<typeof setTimeout>;
    toastId: string | number;
    cancelled: boolean;
  } | null>(null);

  const mutate = useCallback(
    (params: TParams) => {
      const toastId = `undoable-${Date.now()}`;

      const cancel = () => {
        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timer);
          pendingRef.current.cancelled = true;
          pendingRef.current = null;
        }
        toast.dismiss(toastId);
        toast.info("Action cancelled");
      };

      const pendingMsg =
        typeof options.pendingMessage === "function"
          ? options.pendingMessage(params)
          : options.pendingMessage || "Action pending...";

      toast(
        () =>
          createElement(UndoableNotification, {
            message: pendingMsg,
            undoableTimeout: UNDO_TIMEOUT_SECONDS,
            cancelMutation: cancel,
            onClose: () => toast.dismiss(toastId),
          }),
        {
          id: toastId,
          duration: UNDO_TIMEOUT_SECONDS * 1000 + 500,
          unstyled: true,
        }
      );

      const timer = setTimeout(async () => {
        if (pendingRef.current?.cancelled) return;
        pendingRef.current = null;
        toast.dismiss(toastId);

        try {
          const result = await options.mutationFn(params);
          const successMsg =
            typeof options.successMessage === "function"
              ? options.successMessage(params)
              : options.successMessage || "Action completed";
          toast.success(successMsg);
          options.onSuccess?.(result, params);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          const errorMsg =
            typeof options.errorMessage === "function"
              ? options.errorMessage(params)
              : options.errorMessage || `Error: ${error.message}`;
          toast.error(errorMsg);
          options.onError?.(error, params);
        }
      }, UNDO_TIMEOUT_SECONDS * 1000);

      pendingRef.current = { timer, toastId, cancelled: false };
    },
    [options]
  );

  return { mutate };
}
