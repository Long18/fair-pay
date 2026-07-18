import type { KeyboardEvent } from "react";

/** Enter/Space activation for static elements with role="button". */
export function onButtonKeyDown(action: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };
}
