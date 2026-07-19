import { supabaseClient } from "@/utility/supabaseClient";
import type {
  AgentOperationStatus,
  ExternalAgentSubmissionStatus,
} from "../../types";

export const PAGE_SIZE = 20;

export type AgentOpsFeed = "external" | "operations";

export const STATUS_VALUES: ReadonlyArray<AgentOperationStatus> = [
  "pending",
  "previewed",
  "confirmed",
  "committed",
  "failed",
  "expired",
] as const;

export const EXTERNAL_STATUS_VALUES: ReadonlyArray<ExternalAgentSubmissionStatus> = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "failed",
] as const;

export const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

// Typed shim for RPCs not yet in generated Database types.
export const rpc = supabaseClient.rpc.bind(supabaseClient) as unknown as (
  fn: string,
  args?: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: Error | null }>;

export interface ListParams {
  search: string;
  status: string;
  source: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}
