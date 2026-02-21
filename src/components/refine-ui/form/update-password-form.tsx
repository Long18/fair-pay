"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useLink, useRefineOptions, useUpdatePassword } from "@refinedev/core";
import {
  Loader2Icon,
  AlertCircleIcon,
  LockIcon,
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

  const Link = useLink();
  const { title } = useRefineOptions();
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
        onError: (err: Error) => {
          setIsLoading(false);
          setError(err.message || t("auth.passwordUpdateFailed"));
        },
      }
    );
  };

  // Loading state while checking recovery session
  if (isChecking) {
    return (
      <div className={cn(
        "flex", "items-center", "justify-center", "min-h-svh", "p-4",
        "bg-gradient-to-br from-primary/5 via-background to-accent/5",
        "dark:from-background dark:via-background dark:to-background"
      )}>
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Invalid/expired recovery link
  if (!isRecovery) {
    return (
      <div className={cn(
        "flex", "items-center", "justify-center", "min-h-svh", "p-4",
        "bg-gradient-to-br from-primary/5 via-background to-accent/5",
        "dark:from-background dark:via-background dark:to-background",
        "relative", "overflow-hidden"
      )}>
        <Card className={cn(
          "w-full max-w-md", "p-6 sm:p-8", "shadow-xl", "border",
          "glass bg-card/95", "backdrop-blur-sm", "z-10",
          "animate-in fade-in slide-in-from-bottom-4 duration-500"
        )}>
          <CardHeader className={cn("px-0", "pb-6", "text-center", "space-y-2")}>
            <div className={cn("flex", "items-center", "justify-center", "mb-4")}>
              <AlertTriangleIcon className="h-16 w-16 text-amber-500" />
            </div>
            <CardTitle className={cn("text-2xl sm:text-3xl", "font-bold", "text-foreground", "tracking-tight")}>
              {t("auth.invalidResetLink")}
            </CardTitle>
            <CardDescription className={cn("text-base", "text-muted-foreground")}>
              {t("auth.invalidResetLinkDescription")}
            </CardDescription>
          </CardHeader>
          <Separator className="mb-6" />
          <CardContent className={cn("px-0", "space-y-4")}>
            <Button asChild className="w-full h-12 font-semibold">
              <Link to="/forgot-password">
                {t("auth.requestNewResetLink")}
              </Link>
            </Button>
            <div className={cn("text-center")}>
              <Link
                to="/login"
                className={cn(
                  "inline-flex", "items-center", "gap-2", "text-sm",
                  "text-muted-foreground", "hover:text-foreground", "transition-colors"
                )}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>{t("auth.backToLogin")}</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Recovery form
  return (
    <div className={cn(
      "flex", "items-center", "justify-center", "min-h-svh", "p-4",
      "bg-gradient-to-br from-primary/5 via-background to-accent/5",
      "dark:from-background dark:via-background dark:to-background",
      "relative", "overflow-hidden"
    )}>
      <div className="absolute top-0 right-0 w-96 h-96 opacity-5 dark:opacity-3">
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
      </div>
      <div className="absolute bottom-0 left-0 w-80 h-80 opacity-5 dark:opacity-3">
        <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl" />
      </div>

      <Card className={cn(
        "w-full max-w-md", "p-6 sm:p-8", "shadow-xl", "border",
        "glass bg-card/95", "backdrop-blur-sm", "z-10",
        "animate-in fade-in slide-in-from-bottom-4 duration-500"
      )}>
        <CardHeader className={cn("px-0", "pb-6", "text-center", "space-y-2")}>
          <div className={cn("flex", "items-center", "justify-center", "mb-4")}>
            {title.icon ? (
              <div className={cn("text-primary", "[&>svg]:w-16", "[&>svg]:h-16", "animate-in zoom-in duration-300")}>
                {title.icon}
              </div>
            ) : null}
          </div>
          <CardTitle className={cn("text-2xl sm:text-3xl", "font-bold", "text-foreground", "tracking-tight")}>
            {t("auth.updatePassword")}
          </CardTitle>
          <CardDescription className={cn("text-base", "text-muted-foreground")}>
            {t("auth.enterNewPassword")}
          </CardDescription>
        </CardHeader>

        <Separator className="mb-6" />

        <CardContent className={cn("px-0", "space-y-5")}>
          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className={cn("space-y-2")}>
              <label htmlFor="new-password" className="text-sm font-medium flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-muted-foreground" />
                {t("auth.newPassword")}
              </label>
              <InputPassword
                id="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBlur={handlePasswordBlur}
                required
                className={cn("h-11", passwordError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircleIcon className="h-3.5 w-3.5" />
                  {passwordError}
                </p>
              )}
              {password && !passwordError && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  {t("auth.passwordMeetsRequirements")}
                </p>
              )}
            </div>

            <div className={cn("space-y-2")}>
              <label htmlFor="confirm-new-password" className="text-sm font-medium flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-muted-foreground" />
                {t("auth.confirmNewPassword")}
              </label>
              <InputPassword
                id="confirm-new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError(null);
                }}
                onBlur={handleConfirmPasswordBlur}
                required
                className={cn("h-11", confirmPasswordError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!confirmPasswordError}
                aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
              />
              {confirmPasswordError && (
                <p id="confirm-password-error" className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircleIcon className="h-3.5 w-3.5" />
                  {confirmPasswordError}
                </p>
              )}
              {confirmPassword && !confirmPasswordError && password === confirmPassword && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  {t("auth.passwordsMatch")}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className={cn(
                "w-full", "h-12", "font-semibold", "shadow-sm", "transition-all",
                "disabled:opacity-50", "disabled:cursor-not-allowed"
              )}
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

          <div className={cn("mt-8", "text-center")}>
            <Link
              to="/login"
              className={cn(
                "inline-flex", "items-center", "gap-2", "text-sm",
                "text-muted-foreground", "hover:text-foreground", "transition-colors"
              )}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>{t("auth.backToLogin")}</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

UpdatePasswordForm.displayName = "UpdatePasswordForm";
