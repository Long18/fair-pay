import { useEffect, useState } from "react";
import type { RenderedEmail } from "@fairpay/emails";

/**
 * Renders an email asynchronously. While a new render is in flight the previous result stays
 * visible so preview iframes don't flash empty on every keystroke.
 */
export function useRenderedEmail<TInput, TResult extends RenderedEmail>(
  input: TInput | null,
  renderer: (input: TInput) => Promise<TResult>,
): TResult | null {
  const [email, setEmail] = useState<TResult | null>(null);

  useEffect(() => {
    if (!input) return;
    let cancelled = false;
    renderer(input)
      .then((result) => {
        if (!cancelled) setEmail(result);
      })
      .catch((error: unknown) => {
        console.error("[admin/email] preview render failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, [input, renderer]);

  return input ? email : null;
}
