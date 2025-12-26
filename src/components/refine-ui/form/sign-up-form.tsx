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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  useLink,
  useNotification,
  useRefineOptions,
  useRegister,
} from "@refinedev/core";

export const SignUpForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { open } = useNotification();

  const Link = useLink();

  const { title } = useRefineOptions();

  const { mutate: register } = useRegister();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      open?.({
        type: "error",
        message: "Passwords don't match",
        description:
          "Please make sure both password fields contain the same value.",
      });

      return;
    }

    register({
      email,
      password,
    });
  };

  const handleSignUpWithGoogle = () => {
    register({
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
        "bg-gradient-to-br from-teal-50 via-background to-purple-50",
        "dark:from-gray-900 dark:via-background dark:to-gray-800",
        "relative",
        "overflow-hidden"
      )}
    >
      {/* Decorative botanical background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 opacity-10 dark:opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="currentColor" className="text-teal-400 dark:text-teal-600" />
          <circle cx="60" cy="80" r="40" fill="currentColor" className="text-teal-300 dark:text-teal-700" />
          <circle cx="140" cy="120" r="50" fill="currentColor" className="text-purple-300 dark:text-purple-700" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-80 h-80 opacity-10 dark:opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="70" fill="currentColor" className="text-purple-400 dark:text-purple-600" />
          <circle cx="70" cy="70" r="45" fill="currentColor" className="text-teal-300 dark:text-teal-700" />
        </svg>
      </div>

      <Card className={cn("sm:w-[456px]", "p-8", "shadow-xl", "border", "bg-card/95", "backdrop-blur-sm", "z-10")}>
        <CardHeader className={cn("px-0", "pb-6", "text-center")}>
          <div className={cn("flex", "items-center", "justify-center", "mb-4")}>
            {title.icon && (
              <div className={cn("text-primary", "[&>svg]:w-16", "[&>svg]:h-16")}>
                {title.icon}
              </div>
            )}
          </div>
          <CardTitle className={cn("text-2xl", "font-bold", "text-foreground")}>
            Create your account
          </CardTitle>
          <CardDescription className={cn("text-muted-foreground", "font-normal")}>
            Join FairPay to manage your shared expenses
          </CardDescription>
        </CardHeader>

        <Separator className="mb-6" />

        <CardContent className={cn("px-0")}>
          <form onSubmit={handleSignUp}>
            <div className={cn("space-y-1", "mb-4")}>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className={cn("space-y-1", "mb-4")}>
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <InputPassword
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className={cn("space-y-1", "mb-6")}>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm password
              </Label>
              <InputPassword
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className={cn(
                "w-full",
                "h-12",
                "bg-foreground",
                "hover:bg-foreground/90",
                "text-background",
                "font-medium"
              )}
            >
              Sign up
            </Button>

            <div className={cn("flex", "items-center", "gap-4", "my-6")}>
              <Separator className={cn("flex-1")} />
              <span className={cn("text-sm", "text-muted-foreground")}>or</span>
              <Separator className={cn("flex-1")} />
            </div>

            <Button
              variant="outline"
              className={cn("w-full", "flex", "items-center", "justify-center", "gap-2", "h-11")}
              onClick={handleSignUpWithGoogle}
              type="button"
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
              Already have an account?{" "}
            </span>
            <Link
              to="/login"
              className={cn("text-sm", "text-primary", "font-semibold", "hover:underline")}
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

SignUpForm.displayName = "SignUpForm";
