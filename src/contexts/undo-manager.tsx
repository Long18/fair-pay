import { createContext, useCallback, useContext, useRef } from "react";
import { createElement } from "react";
import { toast } from "sonner";
import { UndoableNotification } from "@/components/refine-ui/notification/undoable-notification";

interface UndoEntry {
  key: string;
  actionType: "create" | "update" | "delete";
  message: string;
  undoFn: () => Promise<void>;
  timer: ReturnType<typeof setTimeout>;
  toastId: string | number;
}

interface RegisterUndoOptions {
  key: string;
  actionType: "create" | "update" | "delete";
  message: string;
  undoFn: () => Promise<void>;
  timeout?: number;
}

interface UndoManagerContextValue {
  registerUndo: (options: RegisterUndoOptions) => void;
  executeUndo: (key: string) => Promise<void>;
  clearAll: () => void;
}

const UndoManagerContext = createContext<UndoManagerContextValue | null>(null);

export function UndoManagerProvider({ children }: { children: React.ReactNode }) {
  const entriesRef = useRef<Map<string, UndoEntry>>(new Map());

  const executeUndo = useCallback(async (key: string) => {
    const entries = entriesRef.current;
    const entry = entries.get(key);
    if (!entry) return;

    clearTimeout(entry.timer);
    toast.dismiss(entry.toastId);
    entries.delete(key);

    try {
      await entry.undoFn();
    } catch {
      toast.error("Failed to undo. Please try again.");
    }
  }, []);

  const registerUndo = useCallback(
    (options: RegisterUndoOptions) => {
      const { key, actionType, message, undoFn, timeout = 10 } = options;
      const entries = entriesRef.current;

      const existing = entries.get(key);
      if (existing) {
        clearTimeout(existing.timer);
        toast.dismiss(existing.toastId);
        entries.delete(key);
      }

      const toastId = `undo-${key}-${Date.now()}`;

      const timer = setTimeout(() => {
        entries.delete(key);
        toast.dismiss(toastId);
      }, timeout * 1000);

      const entry: UndoEntry = {
        key,
        actionType,
        message,
        undoFn,
        timer,
        toastId,
      };

      entries.set(key, entry);

      toast(
        () =>
          createElement(UndoableNotification, {
            message,
            undoableTimeout: timeout,
            cancelMutation: () => executeUndo(key),
            onClose: () => toast.dismiss(toastId),
          }),
        {
          id: toastId,
          duration: timeout * 1000,
          unstyled: true,
        }
      );
    },
    [executeUndo]
  );

  const clearAll = useCallback(() => {
    const entries = entriesRef.current;
    for (const entry of entries.values()) {
      clearTimeout(entry.timer);
      toast.dismiss(entry.toastId);
    }
    entries.clear();
  }, []);

  return (
    <UndoManagerContext.Provider value={{ registerUndo, executeUndo, clearAll }}>
      {children}
    </UndoManagerContext.Provider>
  );
}

export function useUndoManager(): UndoManagerContextValue {
  const ctx = useContext(UndoManagerContext);
  if (!ctx) {
    throw new Error("useUndoManager must be used within UndoManagerProvider");
  }
  return ctx;
}
