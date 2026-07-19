import { getCanonicalDestinationPath } from "@/lib/utm";
import type { UtmShareTemplate } from "@/lib/utm-config";
import type { UtmRecentShareRow } from "../../types";

export type FilterState = {
  dateFrom: string;
  dateTo: string;
  source: string;
  campaign: string;
  medium: string;
  entityType: string;
  userId: string;
};

export function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function toIsoStart(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : null;
}

export function toIsoEnd(value: string) {
  return value ? new Date(`${value}T23:59:59`).toISOString() : null;
}

export function optionalFilter(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function getInitialFilters(): FilterState {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    dateFrom: toDateInput(from),
    dateTo: toDateInput(new Date()),
    source: "",
    campaign: "",
    medium: "",
    entityType: "",
    userId: "",
  };
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

export function compactUrlForDisplay(
  row: Pick<UtmRecentShareRow, "destination_path" | "destination_url" | "generated_url" | "generated_path">,
) {
  return getCanonicalDestinationPath(
    row.destination_path || row.destination_url || row.generated_url || row.generated_path || "/",
  );
}

export function getSampleDestinationForTemplate(template: UtmShareTemplate | null | undefined) {
  switch (template?.entity_type) {
    case "expense":
      return "https://long-pay.vercel.app/share/expenses/demo-expense";
    case "debt":
      return "https://long-pay.vercel.app/share/debts/demo-token";
    case "friend":
      return "https://long-pay.vercel.app/share/friends/demo-friend";
    case "profile":
      return "https://long-pay.vercel.app/share/profiles/demo-profile";
    case "group":
      return "https://long-pay.vercel.app/share/groups/demo-group";
    default:
      return "https://long-pay.vercel.app/share/groups/demo-group";
  }
}

export function getRefRows(properties: Record<string, string>) {
  return ["share_ref", "utm_source", "utm_medium", "utm_campaign", "utm_content"]
    .map((key) => ({ key, value: properties[key] }))
    .filter((row) => row.value);
}

export function extractRefCode(url: string): { base: string; ref: string } | null {
  try {
    const u = new URL(url);
    const ref = u.searchParams.get("ref");
    if (!ref) return null;
    u.searchParams.delete("ref");
    return { base: u.toString(), ref };
  } catch {
    return null;
  }
}

export function eventBadgeVariant(eventName: string): "default" | "secondary" | "destructive" | "outline" {
  if (eventName.includes("completed")) return "default";
  if (eventName.includes("copied")) return "secondary";
  if (eventName.includes("failed")) return "destructive";
  return "outline";
}
