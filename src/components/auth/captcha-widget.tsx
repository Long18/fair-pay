"use client";

import { useRef, useCallback } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { cn } from "@/lib/utils";

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

export const CaptchaWidget = ({
  onVerify,
  onExpire,
  onError,
  className,
}: CaptchaWidgetProps) => {
  const hcaptchaRef = useRef<HCaptcha>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const handleHCaptchaExpire = useCallback(() => {
    onExpire?.();
    hcaptchaRef.current?.resetCaptcha();
  }, [onExpire]);

  const handleHCaptchaError = useCallback(() => {
    onError?.();
    hcaptchaRef.current?.resetCaptcha();
  }, [onError]);

  const handleTurnstileExpire = useCallback(() => {
    onExpire?.();
    turnstileRef.current?.reset();
  }, [onExpire]);

  // hCaptcha takes priority if both keys are set
  if (HCAPTCHA_SITE_KEY) {
    return (
      <div className={cn("flex justify-center", className)}>
        <HCaptcha
          ref={hcaptchaRef}
          sitekey={HCAPTCHA_SITE_KEY}
          onVerify={onVerify}
          onExpire={handleHCaptchaExpire}
          onError={handleHCaptchaError}
        />
      </div>
    );
  }

  // Fallback to Turnstile
  if (TURNSTILE_SITE_KEY) {
    return (
      <div className={cn("flex justify-center", className)}>
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={onVerify}
          onExpire={handleTurnstileExpire}
          onError={onError}
          options={{ theme: "auto", size: "flexible" }}
        />
      </div>
    );
  }

  // No captcha configured
  return null;
};
