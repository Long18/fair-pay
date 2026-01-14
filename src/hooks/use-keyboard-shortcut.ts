import { useEffect, useCallback, useRef } from "react";

/**
 * Keyboard Shortcut Configuration
 */
export interface KeyboardShortcut {
  // Key combination (e.g., "cmd+k", "ctrl+shift+f", "esc")
  key: string;
  // Callback function to execute
  callback: (event: KeyboardEvent) => void;
  // Description for documentation/help
  description?: string;
  // Whether to preventDefault on match
  preventDefault?: boolean;
  // Whether shortcut is enabled
  enabled?: boolean;
}

/**
 * useKeyboardShortcut Hook
 *
 * Register keyboard shortcuts with automatic cleanup.
 * Supports modifier keys (cmd/ctrl, shift, alt) and special keys (esc, enter, etc.)
 *
 * @param shortcuts - Array of keyboard shortcut configurations
 *
 * @example
 * useKeyboardShortcut([
 *   {
 *     key: "cmd+k",
 *     callback: () => openCommandPalette(),
 *     description: "Open command palette",
 *   },
 *   {
 *     key: "esc",
 *     callback: () => closeModal(),
 *     description: "Close modal",
 *   }
 * ]);
 *
 * @example
 * // Conditional shortcuts
 * useKeyboardShortcut([
 *   {
 *     key: "cmd+s",
 *     callback: () => saveForm(),
 *     enabled: formDirty,
 *     preventDefault: true,
 *   }
 * ]);
 */
export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    // Check each shortcut
    for (const shortcut of shortcutsRef.current) {
      if (shortcut.enabled === false) continue;

      if (matchesShortcut(event, shortcut.key)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.callback(event);
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Check if keyboard event matches a shortcut string
 *
 * Supports:
 * - Modifier keys: cmd/meta, ctrl, shift, alt
 * - Special keys: esc, enter, space, tab, up, down, left, right
 * - Letter keys: a-z
 * - Number keys: 0-9
 *
 * Examples:
 * - "cmd+k" or "meta+k" (⌘K on Mac, Ctrl+K on Windows if using cmd)
 * - "ctrl+shift+f" (Ctrl+Shift+F)
 * - "esc" (Escape key)
 * - "alt+1" (Alt+1)
 */
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Check modifiers
  for (const modifier of modifiers) {
    switch (modifier) {
      case "cmd":
      case "meta":
        if (!event.metaKey && !event.ctrlKey) return false;
        break;
      case "ctrl":
        if (!event.ctrlKey) return false;
        break;
      case "shift":
        if (!event.shiftKey) return false;
        break;
      case "alt":
      case "option":
        if (!event.altKey) return false;
        break;
    }
  }

  // Check key
  const eventKey = event.key.toLowerCase();

  // Map special keys
  const keyMap: Record<string, string> = {
    escape: "esc",
    " ": "space",
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
  };

  const normalizedEventKey = keyMap[eventKey] || eventKey;
  const normalizedShortcutKey = keyMap[key] || key;

  return normalizedEventKey === normalizedShortcutKey;
}

/**
 * useCommandPaletteShortcut Hook
 *
 * Convenience hook for common "cmd+k" command palette pattern.
 *
 * @param onOpen - Callback to open command palette
 * @param enabled - Whether shortcut is enabled (default: true)
 *
 * @example
 * useCommandPaletteShortcut(() => setCommandPaletteOpen(true));
 */
export function useCommandPaletteShortcut(
  onOpen: () => void,
  enabled: boolean = true
) {
  useKeyboardShortcut([
    {
      key: "cmd+k",
      callback: onOpen,
      description: "Open command palette",
      enabled,
    },
  ]);
}

/**
 * useEscapeKey Hook
 *
 * Convenience hook for handling Escape key (e.g., closing modals)
 *
 * @param onEscape - Callback when Escape is pressed
 * @param enabled - Whether shortcut is enabled (default: true)
 *
 * @example
 * useEscapeKey(() => setModalOpen(false), modalOpen);
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useKeyboardShortcut([
    {
      key: "esc",
      callback: onEscape,
      description: "Close/Cancel",
      enabled,
    },
  ]);
}
