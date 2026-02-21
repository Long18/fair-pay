"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useForgotPassword, useLink, useRefineOptions } from "@refinedev/core";

import {
  ArrowLeftIcon,
  Loader2Icon,
  AlertCircleIcon,
  MailIcon,
  CheckCircle2Icon,
} from "@/components/ui/icons";

export const ForgotPasswordForm = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const Link = useLink();
  const { title } = useRefineOptions();
  const { mutate: forgotPassword } = useForgotPassword();

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
      }
    );
  };

  if (isSuccess) {
    return (
      <div
        className={cn(
          "flex", "items-center", "justify-center", "min-h-svh", "p-4",
          "bg-gradient-to-br from-primary/5 via-background to-accent/5",
          "dark:from-background dark:via-background dark:to-background",
          "relative", "overflow-hidden"
        )}
      >
        <Card className={cn(
          "w-full max-w-md", "p-6 sm:p-8", "shadow-xl", "border",
          "glass bg-card/95", "backdrop-blur-sm", "z-10",
          "animate-in fade-in slide-in-from-bottom-4 duration-500"
        )}>
          <CardHeader className={cn("px-0", "pb-6", "text-center", "space-y-4")}>
            <div className="flex justify-center">
              <div className={cn(
                "w-16 h-16 rounded-full",
                "bg-green-100 dark:bg-green-900/30",
                "flex items-center justify-center",
                "animate-in zoom-in duration-300"
              )}>
                <CheckCircle2Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className={cn("text-2xl", "font-bold", "text-foreground")}>
              {t("auth.resetLinkSent")}
            </CardTitle>
            <CardDescription className={cn("text-base", "text-muted-foreground")}>
              {t("auth.resetLinkSentDescription", { email })}
            </CardDescription>
          </CardHeader>
          <Separator className="mb-6" />
          <CardContent className="px-0 text-center">
            <Link
              to="/login"
              className={cn(
                "inline-flex", "items-center", "gap-2",
                "text-sm", "text-primary", "font-semibold", "hover:underline"
              )}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {t("auth.backToLogin")}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex", "items-center", "justify-center", "min-h-svh", "p-4",
        "bg-gradient-to-br from-primary/5 via-background to-accent/5",
        "dark:from-background dark:via-background dark:to-background",
        "relative", "overflow-hidden"
      )}
    >
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
            {title.icon && (
              <div className={cn("text-primary", "[&>svg]:w-16", "[&>svg]:h-16", "animate-in zoom-in duration-300")}>
                {title.icon}
              </div>
            )}
          </div>
          <CardTitle className={cn("text-2xl sm:text-3xl", "font-bold", "text-foreground", "tracking-tight")}>
            {t("auth.forgotPasswordTitle")}
          </CardTitle>
          <CardDescription className={cn("text-base", "text-muted-foreground")}>
            {t("auth.forgotPasswordDescription")}
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

          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className={cn("space-y-2")}>
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                {t("auth.emailAddress")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={handleEmailBlur}
                className={cn("h-11", emailError && "border-destructive focus-visible:ring-destructive")}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-destructive flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircleIcon className="h-3.5 w-3.5" />
                  {emailError}
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
                  {t("auth.sendingResetLink")}
                </>
              ) : (
                t("auth.sendResetLink")
              )}
            </Button>
          </form>

          <div className={cn("mt-8", "text-center")}>
            <Link
              to="/login"
              className={cn(
                "inline-flex", "items-center", "gap-2",
                "text-sm", "text-muted-foreground", "hover:text-foreground",
                "transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-1"
              )}
            >
              <ArrowLeftIcon className={cn("w-4", "h-4")} />
              <span>{t("auth.backToLogin")}</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

ForgotPasswordForm.displayName = "ForgotPasswordForm";
