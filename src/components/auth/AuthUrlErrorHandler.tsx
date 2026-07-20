import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function readHashAuthParams(): URLSearchParams {
  const raw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(raw);
}

/**
 * Surfaces Supabase OAuth failure params from query or hash
 * (`?error=` / `#error=` / `error_description`), as a toast, then strips them.
 */
export function AuthUrlErrorHandler() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const hashParams = readHashAuthParams();
    const error =
      searchParams.get("error") ?? hashParams.get("error");
    const description =
      searchParams.get("error_description") ??
      hashParams.get("error_description");
    if (!error && !description) return;

    handledRef.current = true;

    const haystack = `${error ?? ""} ${description ?? ""}`.toLowerCase();
    const suggestsMergedAccount =
      haystack.includes("banned_until") ||
      haystack.includes("server_error") ||
      haystack.includes("user_banned") ||
      haystack.includes("banned");

    const message = suggestsMergedAccount
      ? t(
          "auth.oauthMergedAccountHint",
          "Sign-in failed. If you recently merged accounts, try signing in with your primary account email.",
        )
      : description ||
        t("auth.oauthError", "Sign-in failed. Please try again.");

    toast.error(message);

    const next = new URLSearchParams(searchParams);
    next.delete("error");
    next.delete("error_description");
    next.delete("error_code");
    next.delete("sb");
    setSearchParams(next, { replace: true });

    if (
      hashParams.has("error") ||
      hashParams.has("error_description") ||
      hashParams.has("sb")
    ) {
      const cleanedHash = new URLSearchParams(hashParams);
      cleanedHash.delete("error");
      cleanedHash.delete("error_description");
      cleanedHash.delete("error_code");
      cleanedHash.delete("sb");
      const hash = cleanedHash.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}${hash ? `#${hash}` : ""}`,
      );
    }
  }, [searchParams, setSearchParams, t]);

  return null;
}
