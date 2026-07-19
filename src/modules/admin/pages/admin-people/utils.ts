import { supabaseClient } from "@/utility/supabaseClient";
import type { InviteEmailResponse } from "./types";

export type RelationOne<T> = T | T[] | null | undefined;

export const ADMIN_PEOPLE_RENDER_TIME = Date.now();

export function formatSystemRole(role: "admin" | "moderator" | "user", userLabel: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return userLabel;
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function relationOne<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export const FRIENDSHIP_STATUS = {
  accepted: { labelKey: "status.accepted", className: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]" },
  pending: { labelKey: "status.pending", className: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]" },
  rejected: { labelKey: "status.rejected", className: "bg-[var(--status-error-bg)] text-[var(--status-error-foreground)]" },
} as const;

export async function sendInviteEmails(emails: string[], inviterName?: string): Promise<InviteEmailResponse> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("admin-session-missing");
  }

  const response = await fetch("/api/admin/email/send-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      emails,
      inviter_name: inviterName,
    }),
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as InviteEmailResponse) : { success: response.ok };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  }

  return payload;
}
