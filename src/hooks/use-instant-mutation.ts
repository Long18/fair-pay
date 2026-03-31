import { useCreate, useUpdate, useDelete } from "@refinedev/core";
import { useUndoManager } from "@/contexts/undo-manager";
import { useCallback } from "react";

const UNDO_TIMEOUT = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

interface UndoConfig {
  /** Set false to skip undo registration for this call */
  enabled?: boolean;
  /** Toast message shown during undo window */
  message?: string;
  /** Dedup key — defaults to `${resource}:${id}` */
  key?: string;
  /** Custom undo function. Overrides default reverse mutation. */
  undoFn?: () => Promise<void>;
  /** Previous values for update/delete undo (used by default undo) */
  previousValues?: Record<string, unknown>;
}

// Helper to extract undoConfig from meta without polluting the actual meta sent to server
function extractUndoConfig(meta?: Record<string, unknown>): {
  undoConfig: UndoConfig | undefined;
  cleanMeta: Record<string, unknown> | undefined;
} {
  if (!meta) return { undoConfig: undefined, cleanMeta: undefined };
  const { undoConfig, ...rest } = meta as Record<string, unknown> & { undoConfig?: UndoConfig };
  return {
    undoConfig: undoConfig as UndoConfig | undefined,
    cleanMeta: Object.keys(rest).length > 0 ? rest : undefined,
  };
}

// ─── useInstantCreate ────────────────────────────────────────────────────────

export function useInstantCreate() {
  const underlying = useCreate();
  const undoDelete = useDelete();
  const { registerUndo } = useUndoManager();

  const mutate = useCallback(
    (
      params: Parameters<typeof underlying.mutate>[0],
      callbacks?: Parameters<typeof underlying.mutate>[1],
    ) => {
      if (!params) return;
      const { undoConfig, cleanMeta } = extractUndoConfig(params.meta as Record<string, unknown>);
      const enableUndo = undoConfig?.enabled !== false;
      const cleanParams = { ...params, meta: cleanMeta };

      underlying.mutate(cleanParams, {
        ...callbacks,
        onSuccess: (data, variables, onMutateResult, context) => {
          callbacks?.onSuccess?.(data, variables, onMutateResult, context);

          if (enableUndo && data?.data?.id) {
            const createdId = data.data.id as string;
            const resource = params.resource!;
            const key = undoConfig?.key ?? `${resource}:${createdId}`;
            const message = undoConfig?.message ?? "Item created. Undo?";

            registerUndo({
              key,
              actionType: "create",
              message,
              undoFn:
                undoConfig?.undoFn ??
                (() =>
                  new Promise<void>((resolve, reject) => {
                    undoDelete.mutate(
                      {
                        resource,
                        id: createdId,
                        mutationMode: "pessimistic",
                        successNotification: false,
                        errorNotification: false,
                      },
                      { onSuccess: () => resolve(), onError: (err) => reject(err) },
                    );
                  })),
              timeout: UNDO_TIMEOUT,
            });
          }
        },
      });
    },
    [underlying, undoDelete, registerUndo],
  );

  return { ...underlying, mutate };
}

// ─── useInstantUpdate ────────────────────────────────────────────────────────

export function useInstantUpdate() {
  const underlying = useUpdate();
  const revertUpdate = useUpdate();
  const { registerUndo } = useUndoManager();

  const mutate = useCallback(
    (
      params: Parameters<typeof underlying.mutate>[0],
      callbacks?: Parameters<typeof underlying.mutate>[1],
    ) => {
      if (!params) return;
      const { undoConfig, cleanMeta } = extractUndoConfig(params.meta as Record<string, unknown>);
      const enableUndo = undoConfig?.enabled !== false;
      const cleanParams = { ...params, meta: cleanMeta };

      underlying.mutate(cleanParams, {
        ...callbacks,
        onSuccess: (data, variables, onMutateResult, context) => {
          callbacks?.onSuccess?.(data, variables, onMutateResult, context);

          if (enableUndo && params!.id && undoConfig?.previousValues) {
            const resource = params!.resource;
            const id = params!.id;
            const key = undoConfig?.key ?? `${resource}:${id}`;
            const message = undoConfig?.message ?? "Changes saved. Undo?";

            registerUndo({
              key,
              actionType: "update",
              message,
              undoFn:
                undoConfig?.undoFn ??
                (() =>
                  new Promise<void>((resolve, reject) => {
                    revertUpdate.mutate(
                      {
                        resource,
                        id,
                        values: undoConfig!.previousValues!,
                        mutationMode: "pessimistic",
                        successNotification: false,
                        errorNotification: false,
                      },
                      { onSuccess: () => resolve(), onError: (err) => reject(err) },
                    );
                  })),
              timeout: UNDO_TIMEOUT,
            });
          }
        },
      });
    },
    [underlying, revertUpdate, registerUndo],
  );

  return { ...underlying, mutate };
}

// ─── useInstantDelete ────────────────────────────────────────────────────────

export function useInstantDelete() {
  const underlying = useDelete();
  const revertCreate = useCreate();
  const { registerUndo } = useUndoManager();

  const mutate = useCallback(
    (
      params: Parameters<typeof underlying.mutate>[0],
      callbacks?: Parameters<typeof underlying.mutate>[1],
    ) => {
      if (!params) return;
      const { undoConfig, cleanMeta } = extractUndoConfig(params.meta as Record<string, unknown>);
      const enableUndo = undoConfig?.enabled !== false;
      const cleanParams = { ...params, meta: cleanMeta };

      underlying.mutate(cleanParams, {
        ...callbacks,
        onSuccess: (data, variables, onMutateResult, context) => {
          callbacks?.onSuccess?.(data, variables, onMutateResult, context);

          if (enableUndo && undoConfig?.previousValues) {
            const resource = params!.resource;
            const id = params!.id;
            const key = undoConfig?.key ?? `${resource}:${id}`;
            const message = undoConfig?.message ?? "Item deleted. Undo?";

            registerUndo({
              key,
              actionType: "delete",
              message,
              undoFn:
                undoConfig?.undoFn ??
                (() =>
                  new Promise<void>((resolve, reject) => {
                    revertCreate.mutate(
                      {
                        resource,
                        values: undoConfig!.previousValues!,
                        successNotification: false,
                        errorNotification: false,
                      },
                      { onSuccess: () => resolve(), onError: (err) => reject(err) },
                    );
                  })),
              timeout: UNDO_TIMEOUT,
            });
          }
        },
      });
    },
    [underlying, revertCreate, registerUndo],
  );

  return { ...underlying, mutate };
}
