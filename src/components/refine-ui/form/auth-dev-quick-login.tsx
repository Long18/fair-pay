"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Loader2Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type DevRole = "admin" | "moderator" | "user";

type AuthDevQuickLoginProps = {
  activeRole: DevRole | null;
  disabled?: boolean;
  onSignIn: (role: DevRole) => void;
};

const ROLE_LABEL_KEYS: Record<DevRole, "auth.devQuickLoginAdmin" | "auth.devQuickLoginModerator" | "auth.devQuickLoginUser"> = {
  admin: "auth.devQuickLoginAdmin",
  moderator: "auth.devQuickLoginModerator",
  user: "auth.devQuickLoginUser",
};

export function AuthDevQuickLogin({
  activeRole,
  disabled,
  onSignIn,
}: AuthDevQuickLoginProps) {
  const { t } = useTranslation();

  if (!import.meta.env.DEV) {
    return null;
  }

  const roles: DevRole[] = ["admin", "moderator", "user"];

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/40 p-4",
      )}
    >
      <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
        {t("auth.devSectionTitle")}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {roles.map((role) => (
          <Button
            key={role}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="border-dashed"
            onClick={() => onSignIn(role)}
          >
            {activeRole === role ? (
              <Loader2Icon className="mr-1 h-3 w-3 animate-spin" aria-hidden />
            ) : null}
            {t(ROLE_LABEL_KEYS[role])}
          </Button>
        ))}
      </div>
    </div>
  );
}

AuthDevQuickLogin.displayName = "AuthDevQuickLogin";
