"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
type InputPasswordProps = React.ComponentProps<"input">;

export const InputPassword = ({ className, ...props }: InputPasswordProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("relative")}>
      <Input
        type={showPassword ? "text" : "password"}
        className={cn(className)}
        {...props}
      />
      <button
        type="button"
        className={cn(
          "appearance-none",
          "absolute right-3 top-1/2 -translate-y-1/2"
        )}
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? (
          <EyeOffIcon size={18} className={cn("text-muted-foreground")} />
        ) : (
          <EyeIcon size={18} className={cn("text-muted-foreground")} />
        )}
      </button>
    </div>
  );
};

InputPassword.displayName = "InputPassword";
