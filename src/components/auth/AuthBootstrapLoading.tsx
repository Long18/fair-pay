import { useTranslation } from "react-i18next";
import { Loader2Icon } from "@/components/ui/icons";

/**
 * Full-area loading gate shown while Refine `<Authenticated>` checks the session
 * (e.g. right after OAuth redirect) so the login form / empty shell never flashes.
 */
export function AuthBootstrapLoading() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 bg-background px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">
        {t("auth.signingIn", "Signing you in…")}
      </p>
    </div>
  );
}
