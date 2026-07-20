/** Reasons from public.get_login_account_status that require sign-out. */
export type LoginAccountStatusPayload = {
  ok?: boolean;
  reason?: string;
  primary_email?: string | null;
  has_profile?: boolean;
};

export function shouldSignOutForLoginStatus(
  status: LoginAccountStatusPayload | null | undefined,
): boolean {
  if (!status || typeof status !== "object") return false;
  if (status.ok === false) {
    return (
      status.reason === "merged_into_other_account" ||
      status.reason === "auth_user_missing" ||
      status.reason === "unauthenticated"
    );
  }
  return false;
}

export function loginStatusSignOutMessage(
  status: LoginAccountStatusPayload,
  t?: (key: string, fallback: string) => string,
): string {
  const translate =
    t ??
    ((_key: string, fallback: string) => fallback);

  if (status.reason === "merged_into_other_account" && status.primary_email) {
    return translate(
      "auth.oauthMergedAccountHint",
      `This email was merged into another account. Sign in again (try ${status.primary_email} or another linked Google).`,
    );
  }

  if (status.reason === "merged_into_other_account") {
    return translate(
      "auth.oauthMergedAccountHint",
      "This email was merged into another account. Sign in again with a linked Google account.",
    );
  }

  return translate(
    "auth.mergedAccountSignOut",
    "Your session is no longer valid. Please sign in again.",
  );
}
