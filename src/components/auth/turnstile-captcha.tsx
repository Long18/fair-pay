"use client";

import { useRef, useCallback } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { cn } from "@/lib/utils";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const TurnstileCaptcha = ({
  onVerify,
  onExpire,
  onError,
  className,
}: TurnstileCaptchaProps) => {
  const ref = useRef<TurnstileInstance>(null);

  const handleExpire = useCallback(() => {
    onExpire?.();
    ref.current?.reset();
  }, [onExpire]);

  if (!SITE_KEY) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        onSuccess={onVerify}
        onExpire={handleExpire}
        onError={onError}
        options={{
          theme: "auto",
          size: "flexible",
        }}
      />
    </div>
  );
};
