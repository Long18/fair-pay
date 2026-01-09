"use client";

import { useState } from "react";

import { InputPassword } from "@/components/refine-ui/form/input-password";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useLink, useLogin, useRefineOptions, useNotification } from "@refinedev/core";
import { Loader2Icon, AlertCircleIcon, MailIcon, LockIcon } from "@/components/ui/icons";

export const SignInForm = () => {
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const Link = useLink();
  const { open } = useNotification();
  const { title } = useRefineOptions();

  const { mutate: login } = useLogin();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailBlur = () => {
    if (email && !validateEmail(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordBlur = () => {
    if (password && password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
    } else {
      setPasswordError(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    // Validation
    if (!email) {
      setEmailError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setPasswordError("Password is required");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    login(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          setIsLoading(false);
        },
        onError: (error: any) => {
          setIsLoading(false);
          const errorMessage = error?.message || "Invalid email or password. Please try again.";
          setError(errorMessage);
          open?.({
            type: "error",
            message: "Sign in failed",
            description: errorMessage,
          });
        },
      }
    );
  };

  const handleSignInWithGoogle = () => {
    setError(null);
    login({
      providerName: "google",
    });
  };

  return (
    <div
      className={cn(
        "flex",
        "items-center",
        "justify-center",
        "min-h-svh",
        "p-4",
        "bg-gradient-to-br from-primary/5 via-background to-accent/5",
        "dark:from-background dark:via-background dark:to-background",
        "relative",
        "overflow-hidden"
      )}
    >
      {/* Modern gradient background elements - Financial Dashboard style */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-5 dark:opacity-3">
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl" />
      </div>
      <div className="absolute bottom-0 left-0 w-80 h-80 opacity-5 dark:opacity-3">
        <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl" />
      </div>

      <Card className={cn(
        "w-full max-w-md",
        "p-6 sm:p-8",
        "shadow-xl",
        "border",
        "glass bg-card/95",
        "backdrop-blur-sm",
        "z-10",
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
            Welcome back
          </CardTitle>
          <CardDescription className={cn("text-base", "text-muted-foreground")}>
            Sign in to your {title.text || "FairPay"} account
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

          <form onSubmit={handleSignIn} className="space-y-5">
            <div className={cn("space-y-2")}>
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
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

            <div className={cn("space-y-2")}>
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-muted-foreground" />
                Password
              </Label>
              <InputPassword
                id="password"
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
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading}
              className={cn(
                "w-full",
                "h-12",
                "font-semibold",
                "shadow-sm",
                "transition-all",
                "disabled:opacity-50",
                "disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <div className={cn("flex items-center justify-between", "flex-wrap", "gap-3", "pt-2")}>
              <div className={cn("flex items-center", "space-x-2", "group")}>
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked === "indeterminate" ? false : checked)
                  }
                  className="cursor-pointer"
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer group-hover:text-foreground transition-colors"
                >
                  Remember me
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className={cn(
                  "text-sm",
                  "text-primary",
                  "hover:text-primary/80",
                  "hover:underline",
                  "font-medium",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-1"
                )}
              >
                Forgot password?
              </Link>
            </div>

            <div className={cn("flex", "items-center", "gap-4", "my-6")}>
              <Separator className={cn("flex-1")} />
              <span className={cn("text-xs", "text-muted-foreground", "uppercase", "tracking-wider", "font-medium")}>
                or continue with
              </span>
              <Separator className={cn("flex-1")} />
            </div>

            <Button
              variant="outline"
              className={cn(
                "w-full",
                "flex",
                "items-center",
                "justify-center",
                "gap-2.5",
                "h-11",
                "border-2",
                "hover:bg-accent/50",
                "transition-all",
                "font-medium"
              )}
              onClick={handleSignInWithGoogle}
              type="button"
              disabled={isLoading}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 21 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.8375 8.63637C16.1151 8.63503 13.3926 8.6357 10.6702 8.63601C10.6705 9.76521 10.6688 10.8944 10.6708 12.0233C12.2475 12.0229 13.8242 12.0226 15.4005 12.0233C15.2178 13.1053 14.5747 14.0949 13.6628 14.704C13.0895 15.0895 12.4309 15.3397 11.7519 15.4586C11.0685 15.5752 10.3623 15.5902 9.68064 15.4522C8.9874 15.3138 8.32566 15.025 7.74838 14.6179C6.82531 13.9694 6.12086 13.0205 5.75916 11.9527C5.38931 10.8666 5.38659 9.65804 5.76085 8.57294C6.02053 7.80816 6.45275 7.10169 7.02054 6.52677C7.7209 5.80979 8.63145 5.29725 9.61248 5.08707C10.4525 4.90775 11.3383 4.94197 12.1607 5.19078C12.8597 5.40301 13.5041 5.78605 14.032 6.29013C14.5655 5.75959 15.0964 5.22602 15.629 4.6945C15.9083 4.4084 16.2019 4.13482 16.4724 3.84092C15.6636 3.09241 14.7154 2.49071 13.6794 2.11035C11.8143 1.42392 9.7108 1.40935 7.83312 2.05923C5.71711 2.78366 3.91535 4.36606 2.91636 6.36616C2.56856 7.05534 2.31463 7.79094 2.16209 8.54757C1.77834 10.4327 2.04582 12.4426 2.91533 14.1596C3.48044 15.2803 4.29063 16.2766 5.27339 17.0577C6.20055 17.797 7.28124 18.3431 8.42705 18.6479C9.87286 19.0357 11.4119 19.0269 12.8672 18.6957C14.1825 18.393 15.4269 17.7645 16.4205 16.8472C17.4707 15.882 18.2199 14.6105 18.6165 13.244C19.0491 11.7534 19.1088 10.1622 18.8375 8.63637Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-sm">Continue with Google</span>
            </Button>
          </form>
        </CardContent>

        <Separator className="my-6" />

        <CardFooter className="px-0">
          <div className={cn("w-full", "text-center")}>
            <span className={cn("text-sm", "text-muted-foreground")}>
              Don't have an account?{" "}
            </span>
            <Link
              to="/register"
              className={cn("text-sm", "text-primary", "font-semibold", "hover:underline")}
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

SignInForm.displayName = "SignInForm";
