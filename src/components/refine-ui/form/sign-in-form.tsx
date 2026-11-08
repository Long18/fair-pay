"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthDevQuickLogin } from "@/components/refine-ui/form/auth-dev-quick-login";
import { AuthFormShell } from "@/components/refine-ui/form/auth-form-shell";
import { AuthOAuthDivider } from "@/components/refine-ui/form/auth-oauth-divider";
import { AuthPageLayout } from "@/components/refine-ui/form/auth-page-layout";
import { GoogleOAuthButton } from "@/components/refine-ui/form/google-oauth-button";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useLogin, useRefineOptions, useNotification } from "@refinedev/core";
import { Link } from "react-router";
import { useHaptics } from "@/hooks/use-haptics";
import { Loader2Icon, AlertCircleIcon } from "@/components/ui/icons";
import { journeyTracking } from "@/lib/journey-tracking";

export const SignInForm = () => {
  const { t } = useTranslation();
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devSignInRole, setDevSignInRole] = useState<"admin" | "moderator" | "user" | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const { open } = useNotification();
  const { title } = useRefineOptions();

  const { mutate: login } = useLogin();
  const { tap, success, error: hapticError } = useHaptics();

  useEffect(() => {
    journeyTracking.trackFormView("auth-login", "credentials");
    journeyTracking.trackEvent({
      event_name: "auth_login_started",
      event_category: "auth",
      page_path: window.location.pathname,
      flow_name: "auth-login",
      step_name: "credentials",
      properties: { method: "email" },
    });
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError(t("auth.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (password && password.length < 6) {
      setPasswordError(t("auth.passwordMinLength"));
    } else {
      setPasswordError(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    if (!email) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:login:submit",
        flow_name: "auth-login",
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
        target_key: "auth:login:submit",
        flow_name: "auth-login",
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
        target_key: "auth:login:submit",
        flow_name: "auth-login",
        step_name: "credentials",
        properties: { reason: "missing_password" },
      });
      setPasswordError(t("auth.passwordRequired"));
      return;
    }
    if (password.length < 6) {
      journeyTracking.trackEvent({
        event_name: "form_error",
        event_category: "auth",
        page_path: window.location.pathname,
        target_type: "form",
        target_key: "auth:login:submit",
        flow_name: "auth-login",
        step_name: "credentials",
        properties: { reason: "password_too_short" },
      });
      setPasswordError(t("auth.passwordMinLength"));
      return;
    }

    setIsLoading(true);
    journeyTracking.trackEvent({
      event_name: "form_submit",
      event_category: "auth",
      page_path: window.location.pathname,
      target_type: "form",
      target_key: "auth:login:submit",
      flow_name: "auth-login",
      step_name: "credentials",
      properties: { method: "email" },
    });
    journeyTracking.trackEvent({
      event_name: "auth_login_submitted",
      event_category: "auth",
      page_path: window.location.pathname,
      flow_name: "auth-login",
      step_name: "credentials",
      properties: { method: "email" },
    });

    login(
      { email, password },
      {
        onSuccess: () => {
          success();
          setIsLoading(false);
          journeyTracking.trackEvent({
            event_name: "form_success",
            event_category: "auth",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "auth:login:submit",
            flow_name: "auth-login",
            step_name: "credentials",
            properties: { method: "email" },
          });
          journeyTracking.trackEvent({
            event_name: "auth_login_success",
            event_category: "auth",
            page_path: window.location.pathname,
            flow_name: "auth-login",
            step_name: "credentials",
            properties: { method: "email" },
          });
        },
        onError: (error: unknown) => {
          hapticError();
          setIsLoading(false);
          const errorMessage =
            error instanceof Error
              ? error.message
              : (typeof error === "object" && error !== null && "message" in error && typeof (error as { message: unknown }).message === "string"
                  ? (error as { message: string }).message
                  : t("auth.invalidCredentials"));
          setError(errorMessage);
          journeyTracking.trackEvent({
            event_name: "form_error",
            event_category: "auth",
            page_path: window.location.pathname,
            target_type: "form",
            target_key: "auth:login:submit",
            flow_name: "auth-login",
            step_name: "credentials",
            properties: { method: "email", reason: "server_error" },
          });
          journeyTracking.trackEvent({
            event_name: "auth_login_failed",
            event_category: "auth",
            page_path: window.location.pathname,
            flow_name: "auth-login",
            step_name: "credentials",
            properties: { method: "email", reason: "server_error" },
          });
          open?.({
            type: "error",
            message: t("auth.signInFailed"),
            description: errorMessage,
          });
        },
      }
    );
  };

  const handleDevSignIn = (role: "admin" | "moderator" | "user") => {
    const devCredentials: Record<string, { email: string | undefined; password: string | undefined }> = {
      admin: { email: import.meta.env.VITE_DEV_ADMIN_EMAIL, password: import.meta.env.VITE_DEV_ADMIN_PASSWORD },
      moderator: { email: import.meta.env.VITE_DEV_MODERATOR_EMAIL, password: import.meta.env.VITE_DEV_MODERATOR_PASSWORD },
      user: { email: import.meta.env.VITE_DEV_USER_EMAIL, password: import.meta.env.VITE_DEV_USER_PASSWORD },
    };

    const { email, password } = devCredentials[role];

    if (!email || !password) {
      setError(`Missing VITE_DEV_${role.toUpperCase()}_EMAIL / VITE_DEV_${role.toUpperCase()}_PASSWORD in .env`);
      return;
    }

    setDevSignInRole(role);
    setIsLoading(true);
    setError(null);

    login(
      { email, password },
      {
        onSuccess: () => {
          success();
          setIsLoading(false);
          setDevSignInRole(null);
        },
        onError: (error: unknown) => {
          hapticError();
          setIsLoading(false);
          setDevSignInRole(null);
          const fallback = `Dev sign-in as ${role} failed. Ensure local Supabase has test users seeded.`;
          let message =
            error instanceof Error
              ? error.message
              : (typeof error === "object" && error !== null && "message" in error && typeof (error as { message: unknown }).message === "string"
                  ? (error as { message: string }).message
                  : fallback);
          if (/failed to fetch/i.test(message)) {
            message =
              "Cannot reach Supabase (Failed to fetch). For local dev: run `supabase start` (or `supabase stop && supabase start` if the DB container exited).";
          }
          setError(message);
        },
      }
    );
  };

  const handleSignInWithGoogle = () => {
    tap();
    setError(null);
    journeyTracking.trackEvent({
      event_name: "cta_click",
      event_category: "auth",
      page_path: window.location.pathname,
      target_type: "button",
      target_key: "auth:login:google",
      flow_name: "auth-login",
      step_name: "oauth",
      properties: { provider: "google" },
    });
    login({ providerName: "google" });
  };

  return (
    <AuthPageLayout>
      <AuthFormShell
        title={t("auth.welcomeBack")}
        description={t("auth.signInToAccount", { appName: title.text || "FairPay" })}
        footer={
          <>
            <span className="text-sm text-muted-foreground">{t("auth.dontHaveAccount")} </span>
            <Link
              to="/register"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("auth.signUp")}
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

        <form onSubmit={handleSignIn} className="space-y-5">
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
              className={cn(
                "min-h-4 text-xs text-destructive",
                !emailError && "invisible",
              )}
              aria-live="polite"
            >
              {emailError ?? "\u00a0"}
            </p>
          </div>

          <div className="relative flex flex-col gap-2">
            <Label htmlFor="password" className="w-fit text-sm font-medium">
              {t("auth.password")}
            </Label>
            <Link
              to="/forgot-password"
              className={cn(
                "absolute top-0 right-0 text-sm font-normal text-foreground",
                "rounded-sm outline-hidden hover:underline",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              {t("auth.forgotPassword")}
            </Link>
            <InputPassword
              id="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={handlePasswordBlur}
              required
              className={cn("h-12", passwordError && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
            />
            <p
              id="password-error"
              className={cn(
                "min-h-4 text-xs text-destructive",
                !passwordError && "invisible",
              )}
              aria-live="polite"
            >
              {passwordError ?? "\u00a0"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) =>
                setRememberMe(checked === "indeterminate" ? false : checked)
              }
            />
            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
              {t("auth.rememberMe")}
            </Label>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            data-track-id="auth:login:submit"
            data-track-event="form_submit"
            data-track-type="form"
            data-track-category="auth"
            data-track-flow="auth-login"
            data-track-step="credentials"
            className="h-12 w-full font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signingIn")}
              </>
            ) : (
              t("auth.signIn")
            )}
          </Button>

          <AuthOAuthDivider />

          <GoogleOAuthButton
            onClick={handleSignInWithGoogle}
            disabled={isLoading}
            data-track-id="auth:login:google"
            data-track-event="cta_click"
            data-track-type="button"
            data-track-category="auth"
            data-track-flow="auth-login"
            data-track-step="oauth"
          />

          <AuthDevQuickLogin
            activeRole={devSignInRole}
            disabled={isLoading}
            onSignIn={handleDevSignIn}
          />
        </form>
      </AuthFormShell>
    </AuthPageLayout>
  );
};

SignInForm.displayName = "SignInForm";
