"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";
import { useForgotPassword, useLink, useRefineOptions } from "@refinedev/core";

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState("");

  const Link = useLink();

  const { title } = useRefineOptions();

  const { mutate: forgotPassword } = useForgotPassword();

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    forgotPassword({
      email,
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
        "dark:from-gray-900 dark:via-background dark:to-gray-800"
      )}
    >
      <Card className={cn("sm:w-[456px]", "p-8", "shadow-xl", "border", "bg-card/95", "backdrop-blur-sm")}>
        <CardHeader className={cn("px-0", "pb-6", "text-center")}>
          <div className={cn("flex", "items-center", "justify-center", "mb-4")}>
            {title.icon && (
              <div className={cn("text-primary", "[&>svg]:w-16", "[&>svg]:h-16")}>
                {title.icon}
              </div>
            )}
          </div>
          <CardTitle className={cn("text-2xl", "font-bold", "text-foreground")}>
            Forgot password?
          </CardTitle>
          <CardDescription className={cn("text-muted-foreground", "font-normal")}>
            Enter your email to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent className={cn("px-0")}>
          <form onSubmit={handleForgotPassword}>
            <div className={cn("space-y-1", "mb-6")}>
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
              Send reset link
            </Button>
          </form>

          <div className={cn("mt-8", "text-center")}>
            <Link
              to="/login"
              className={cn(
                "inline-flex",
                "items-center",
                "gap-2",
                "text-sm",
                "text-muted-foreground",
                "hover:text-foreground",
                "transition-colors"
              )}
            >
              <ArrowLeft className={cn("w-4", "h-4")} />
              <span>Back to login</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

ForgotPasswordForm.displayName = "ForgotPasswordForm";
