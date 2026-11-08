"use client";

import { useEffect, useState } from "react";
import { useHaptics } from "@/hooks/use-haptics";
import { useTranslation } from "react-i18next";

import { AuthFormShell } from "@/components/refine-ui/form/auth-form-shell";
import { AuthOAuthDivider } from "@/components/refine-ui/form/auth-oauth-divider";
import { AuthPageLayout } from "@/components/refine-ui/form/auth-page-layout";
import { GoogleOAuthButton } from "@/components/refine-ui/form/google-oauth-button";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useNotification, useRefineOptions, useRegister } from "@refinedev/core";
import { Link } from "react-router";
import { semanticStatusColors } from "@/lib/status-colors";
import { Loader2Icon, AlertCircleIcon, CheckCircle2Icon } from "@/components/ui/icons";
import { journeyTracking } from "@/lib/journey-tracking";

export const SignUpForm = () => {
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const { open } = useNotification();
  const { title } = useRefineOptions();
  const { mutate: register } = useRegister();

  useEffect(() => {
    journeyTracking.trackFormView("auth-register", "credentials");
    journeyTracking.trackEvent({
      event_name: "auth_signup_started",
      event_category: "auth",
      page_path: window.location.pathname,
      flow_name: "auth-register",
      step_name: "credentials",
      properties: { method: "email" },
    });
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 6) {
      return { valid: false, message: t("auth.passwordMinLength") };
    }
    if (password.length > 72) {
      return { valid: false, message: t("auth.passwordMaxLength") };
    }
    return { valid: true };
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError(t("auth.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (password) {
      const validation = validatePassword(password);
      if (!validation.valid) {
        setPasswordError(validation.message || t("auth.invalidPassword"));
      } else {
        setPasswordError(null);
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError(t("auth.passwordsDoNotMatch"));
    } else {
      setConfirmPasswordError(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!email) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "missing_email" },
      });
      setEmailError(t("auth.emailRequired"));
      return;
    }
    if (!validateEmail(email)) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "invalid_email" },
      });
      setEmailError(t("auth.invalidEmail"));
      return;
    }
    if (!password) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "missing_password" },
      });
      setPasswordError(t("auth.passwordRequired"));
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "invalid_password" },
      });
      setPasswordError(passwordValidation.message || t("auth.invalidPassword"));
      return;
    }
    if (!confirmPassword) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "missing_confirm_password" },
      });
      setConfirmPasswordError(t("auth.confirmPasswordRequired"));
      return;
    }
    if (password !== confirmPassword) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:register:submit",
        flow_name: "auth-register",
        step_name: "credentials",
        properties: { reason: "password_mismatch" },
      });
      setConfirmPasswordError(t("auth.passwordsDoNotMatch"));
      open?.({
        type: "error",
        message: t("auth.passwordsDoNotMatch"),
        description: t("auth.passwordsDoNotMatch"),
      });
      return;
    }

    setIsLoading(true);
    journeyTracking.trackEvent({
      event_name: "form_submit",
      event_category: "auth",
      page_path: window.location.pathname,
      target_type: "form",
      target_key: "auth:register:submit",
      flow_name: "auth-register",
      step_name: "credentials",
      properties: { method: "email" },
    });

    register(
      { email, password },
      {
        onSuccess: () => {
          setIsLoading(false);
          journeyTracking.trackEvent({
            event_name: "form_success",
            event_category: "auth",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "auth:register:submit",
            flow_name: "auth-register",
            step_name: "credentials",
            properties: { method: "email" },
          });
          journeyTracking.trackEvent({
            event_name: "auth_signup_success",
            event_category: "auth",
            page_path: window.location.pathname,
            flow_name: "auth-register",
            step_name: "credentials",
            properties: { method: "email" },
          });
        },
        onError: (error: unknown) => {
          setIsLoading(false);
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === "object" &&
                  error !== null &&
                  "message" in error &&
                  typeof (error as { message: unknown }).message === "string"
                ? (error as { message: string }).message
                : t("auth.registrationFailed");
          setError(errorMessage);
          journeyTracking.trackEvent({
            event_name: "form_error",
            event_category: "auth",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "auth:register:submit",
            flow_name: "auth-register",
            step_name: "credentials",
            properties: { method: "email", reason: "server_error" },
          });
          journeyTracking.trackEvent({
            event_name: "auth_signup_failed",
            event_category: "auth",
            page_path: window.location.pathname,
            flow_name: "auth-register",
            step_name: "credentials",
            properties: { method: "email", reason: "server_error" },
          });
          open?.({
            type: "error",
            message: t("auth.signUpFailed"),
            description: errorMessage,
          });
        },
      }
    );
  };

  const handleSignUpWithGoogle = () => {
    tap();
    setError(null);
    journeyTracking.trackEvent({
      event_name: "cta_click",
      event_category: "auth",
      page_path: window.location.pathname,
      target_type: "button",
      target_key: "auth:register:google",
      flow_name: "auth-register",
      step_name: "oauth",
      properties: { provider: "google" },
    });
    register({ providerName: "google" });
  };

  return (
    <AuthPageLayout>
      <AuthFormShell
        title={t("auth.createYourAccount")}
        description={t("auth.joinToManage", { appName: title.text || "FairPay" })}
        footer={
          <>
            <span className="text-sm text-muted-foreground">{t("auth.alreadyHaveAccount")} </span>
            <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
              {t("auth.signIn")}
            </Link>
          </>
        }
      >
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSignUp} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t("auth.emailAddress")}
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder={t("auth.emailPlaceholder")}
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={handleEmailBlur}
              className={cn("h-12", emailError && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            <p
              id="email-error"
              className={cn("min-h-4 text-xs text-destructive", !emailError && "invisible")}
              aria-live="polite"
            >
              {emailError ?? "\u00a0"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t("auth.password")}
            </Label>
            <InputPassword
              id="password"
              autoComplete="new-password"
              placeholder={t("auth.passwordCreatePlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
                if (confirmPassword && confirmPasswordError) setConfirmPasswordError(null);
              }}
              onBlur={handlePasswordBlur}
              required
              className={cn("h-12", passwordError && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!passwordError}
              aria-describedby={
                passwordError
                  ? "password-error"
                  : password && !passwordError
                    ? "password-hint"
                    : undefined
              }
            />
            {passwordError ? (
              <p id="password-error" className="min-h-4 text-xs text-destructive" aria-live="polite">
                {passwordError}
              </p>
            ) : password ? (
              <p
                id="password-hint"
                className="flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground"
              >
                <CheckCircle2Icon className={cn("h-3.5 w-3.5", semanticStatusColors.success.icon)} />
                {t("auth.passwordMeetsRequirements")}
              </p>
            ) : (
              <p className="min-h-4 text-xs text-muted-foreground">{t("auth.passwordHintMinLength")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {t("auth.confirmPassword")}
            </Label>
            <InputPassword
              id="confirmPassword"
              autoComplete="new-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) setConfirmPasswordError(null);
              }}
              onBlur={handleConfirmPasswordBlur}
              required
              className={cn(
                "h-12",
                confirmPasswordError && "border-destructive focus-visible:ring-destructive",
              )}
              aria-invalid={!!confirmPasswordError}
              aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
            />
            {confirmPasswordError ? (
              <p
                id="confirm-password-error"
                className="min-h-4 text-xs text-destructive"
                aria-live="polite"
              >
                {confirmPasswordError}
              </p>
            ) : confirmPassword && password === confirmPassword ? (
              <p className="flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2Icon className={cn("h-3.5 w-3.5", semanticStatusColors.success.icon)} />
                {t("auth.passwordsMatch")}
              </p>
            ) : (
              <p className="min-h-4 text-xs invisible" aria-hidden>
                {"\u00a0"}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            data-track-id="auth:register:submit"
            data-track-event="form_submit"
            data-track-type="form"
            data-track-category="auth"
            data-track-flow="auth-register"
            data-track-step="credentials"
            className="h-12 w-full font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.creatingAccount")}
              </>
            ) : (
              t("auth.signUp")
            )}
          </Button>

          <AuthOAuthDivider />

          <GoogleOAuthButton
            onClick={handleSignUpWithGoogle}
            disabled={isLoading}
            data-track-id="auth:register:google"
            data-track-event="cta_click"
            data-track-type="button"
            data-track-category="auth"
            data-track-flow="auth-register"
            data-track-step="oauth"
          />
        </form>
      </AuthFormShell>
    </AuthPageLayout>
  );
};

SignUpForm.displayName = "SignUpForm";
