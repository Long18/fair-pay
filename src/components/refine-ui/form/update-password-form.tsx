"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthFormShell } from "@/components/refine-ui/form/auth-form-shell";
import { AuthPageLayout } from "@/components/refine-ui/form/auth-page-layout";
import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useUpdatePassword } from "@refinedev/core";
import { Link } from "react-router";
import { semanticStatusColors } from "@/lib/status-colors";
import {
  Loader2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ArrowLeftIcon,
  AlertTriangleIcon,
} from "@/components/ui/icons";
import { supabaseClient } from "@/utility";

type UpdatePasswordVariables = {
  password: string;
};

export const UpdatePasswordForm = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const { mutate: updatePassword } = useUpdatePassword<UpdatePasswordVariables>();

  // Detect recovery session from Supabase auth state change
  useEffect(() => {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setIsChecking(false);
      }
    });

    // Also check current session as fallback (token may already be exchanged)
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true);
      }
      setIsChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pwd: string): { valid: boolean; message?: string } => {
    if (pwd.length < 6) {
      return { valid: false, message: t("auth.passwordMinLength") };
    }
    if (pwd.length > 72) {
      return { valid: false, message: t("auth.passwordMaxLength") };
    }
    return { valid: true };
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

  const handleUpdatePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!password) {
      setPasswordError(t("auth.passwordRequired"));
      return;
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.message || t("auth.invalidPassword"));
      return;
    }
    if (!confirmPassword) {
      setConfirmPasswordError(t("auth.confirmPasswordRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);

    updatePassword(
      { password },
      {
        onSuccess: () => {
          setIsLoading(false);
        },
        onError: (err) => {
          setIsLoading(false);
          setError(err.message || t("auth.passwordUpdateFailed"));
        },
      }
    );
  };

  if (isChecking) {
    return (
      <AuthPageLayout>
        <div className="flex justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">{t("auth.updatingPassword")}</span>
        </div>
      </AuthPageLayout>
    );
  }

  if (!isRecovery) {
    return (
      <AuthPageLayout>
        <AuthFormShell
          showLogo={false}
          title={t("auth.invalidResetLink")}
          description={t("auth.invalidResetLinkDescription")}
        >
          <div className="flex justify-center pb-2">
            <AlertTriangleIcon
              className={cn("size-12", semanticStatusColors.warning.icon)}
              aria-hidden
            />
          </div>
          <Button asChild className="h-12 w-full font-semibold">
            <Link to="/forgot-password">{t("auth.requestNewResetLink")}</Link>
          </Button>
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" aria-hidden />
              <span>{t("auth.backToLogin")}</span>
            </Link>
          </div>
        </AuthFormShell>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout>
      <AuthFormShell
        title={t("auth.updatePassword")}
        description={t("auth.enterNewPassword")}
      >
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              {t("auth.newPassword")}
            </Label>
            <InputPassword
              id="new-password"
              autoComplete="new-password"
              autoFocus
              placeholder={t("auth.passwordCreatePlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={handlePasswordBlur}
              required
              className={cn("h-12", passwordError && "border-destructive focus-visible:ring-destructive")}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : "password-hint"}
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
              <p id="password-hint" className="min-h-4 text-xs text-muted-foreground">
                {t("auth.passwordHintMinLength")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password" className="text-sm font-medium">
              {t("auth.confirmNewPassword")}
            </Label>
            <InputPassword
              id="confirm-new-password"
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
            className="h-12 w-full font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.updatingPassword")}
              </>
            ) : (
              t("auth.updatePassword")
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            <span>{t("auth.backToLogin")}</span>
          </Link>
        </div>
      </AuthFormShell>
    </AuthPageLayout>
  );
};

UpdatePasswordForm.displayName = "UpdatePasswordForm";
