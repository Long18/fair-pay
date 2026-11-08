"use client";

import { useTranslation } from "react-i18next";

export function AuthOAuthDivider() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3" role="presentation">
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-xs text-muted-foreground">{t("auth.orContinueWith")}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

AuthOAuthDivider.displayName = "AuthOAuthDivider";
