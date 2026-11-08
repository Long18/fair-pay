"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthFormShell } from "@/components/refine-ui/form/auth-form-shell";
import { AuthPageLayout } from "@/components/refine-ui/form/auth-page-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useForgotPassword } from "@refinedev/core";
import { Link } from "react-router";
import { semanticStatusColors } from "@/lib/status-colors";

import {
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "@/components/ui/icons";

export const ForgotPasswordForm = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { mutate: forgotPassword } = useForgotPassword();

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError(t("auth.invalidEmail"));
    } else {
      setEmailError(null);
    }
  };

  const handleForgotPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    if (!email) {
      setEmailError(t("auth.emailRequired"));
      return;
    }
    if (!validateEmail(email)) {
      setEmailError(t("auth.invalidEmail"));
      return;
    }

    setIsLoading(true);

    forgotPassword(
      { email },
      {
        onSuccess: () => {
          setIsLoading(false);
          setIsSuccess(true);
        },
        onError: (err) => {
          setIsLoading(false);
          setError(err?.message || t("auth.forgotPasswordFailed"));
        },
      },
    );
  };

  if (isSuccess) {
    return (
      <AuthPageLayout>
        <AuthFormShell
          showLogo={false}
          title={t("auth.resetLinkSent")}
          description={t("auth.resetLinkSentDescription", { email })}
        >
          <div className="flex justify-center py-2">
            <div
              className={cn(
                "flex size-14 items-center justify-center rounded-full",
                semanticStatusColors.success.bg,
              )}
            >
              <CheckCircle2Icon className={cn("size-7", semanticStatusColors.success.icon)} />
            </div>
          </div>
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              {t("auth.backToLogin")}
            </Link>
          </div>
        </AuthFormShell>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <AuthFormShell
        title={t("auth.forgotPasswordTitle")}
        description={t("auth.forgotPasswordDescription")}
      >
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleForgotPassword} className="space-y-5">
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

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="h-12 w-full font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.sendingResetLink")}
              </>
            ) : (
              t("auth.sendResetLink")
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className={cn(
              "inline-flex items-center gap-2 text-sm text-muted-foreground",
              "rounded-sm transition-colors hover:text-foreground",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-hidden",
            )}
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            <span>{t("auth.backToLogin")}</span>
          </Link>
        </div>
      </AuthFormShell>
    </AuthPageLayout>
  );
};

ForgotPasswordForm.displayName = "ForgotPasswordForm";
