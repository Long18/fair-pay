import { useEffect, useRef, type RefObject } from "react";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || TYPING_TAGS.has(target.tagName);
}

interface UseRowKeyboardNavOptions<T> {
  /** Only listen while the detail pane is open */
  enabled: boolean;
  rows: readonly T[];
  getId: (row: T) => string;
  selectedId: string | null;
  onSelect: (row: T) => void;
  /** Scroll container holding rows tagged with `data-row-id` */
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * List navigation for master/detail screens: `j`/`k` anywhere outside text
 * inputs, ArrowDown/ArrowUp while focus is inside the list.
 */
export function useRowKeyboardNav<T>({
  enabled,
  rows,
  getId,
  selectedId,
  onSelect,
  containerRef,
}: UseRowKeyboardNavOptions<T>) {
  const stateRef = useRef({ rows, getId, selectedId, onSelect });
  useEffect(() => {
    stateRef.current = { rows, getId, selectedId, onSelect };
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.target instanceof HTMLElement && event.target.closest('[role="alertdialog"]')) return;

      const container = containerRef.current;
      const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
      if (isArrow && !(event.target instanceof Node && container?.contains(event.target))) return;

      const step =
        event.key === "j" || event.key === "ArrowDown"
          ? 1
          : event.key === "k" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (step === 0) return;

      const { rows: list, getId: idOf, selectedId: current, onSelect: select } = stateRef.current;
      if (list.length === 0) return;
      const index = list.findIndex((row) => idOf(row) === current);
      const nextIndex = index === -1 ? 0 : Math.min(list.length - 1, Math.max(0, index + step));
      if (nextIndex === index) return;

      event.preventDefault();
      const next = list[nextIndex];
      select(next);

      const focusInside = container?.contains(document.activeElement) ?? false;
      requestAnimationFrame(() => {
        const el = container?.querySelector<HTMLElement>(
          `[data-row-id="${CSS.escape(idOf(next))}"]`
        );
        el?.scrollIntoView({ block: "nearest" });
        if (focusInside) el?.focus({ preventScroll: true });
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, containerRef]);
}
