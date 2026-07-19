import { useQuery } from "@tanstack/react-query";
import type {
  AgentOperationMetrics,
  AdminAgentOperationsResponse,
  ExternalAgentSubmissionMetrics,
  AdminExternalAgentSubmissionsResponse,
} from "../../types";
import { PAGE_SIZE, rpc, type ListParams } from "./constants";

export function useAgentOperations(params: ListParams, enabled: boolean) {
  return useQuery<AdminAgentOperationsResponse>({
    queryKey: ["admin", "agent-operations", params],
    enabled,
    queryFn: async () => {
      const { data, error } = await rpc("admin_list_agent_operations", {
        p_status: params.status === "all" ? null : params.status,
        p_user_id: null,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo
          ? new Date(params.dateTo + "T23:59:59").toISOString()
          : null,
        p_search: params.search || null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? {
        data: [],
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
      }) as AdminAgentOperationsResponse;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useExternalSubmissions(params: ListParams, enabled: boolean) {
  return useQuery<AdminExternalAgentSubmissionsResponse>({
    queryKey: ["admin", "external-agent-submissions", params],
    enabled,
    queryFn: async () => {
      const { data, error } = await rpc("admin_list_external_agent_submissions", {
        p_status: params.status === "all" ? null : params.status,
        p_source: params.source === "all" ? null : params.source,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo
          ? new Date(params.dateTo + "T23:59:59").toISOString()
          : null,
        p_search: params.search || null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return (data ?? {
        data: [],
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
      }) as AdminExternalAgentSubmissionsResponse;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAgentMetrics(params: { dateFrom: string; dateTo: string }) {
  return useQuery<AgentOperationMetrics>({
    queryKey: ["admin", "agent-operation-metrics", params],
    queryFn: async () => {
      const { data, error } = await rpc("admin_get_agent_operation_metrics", {
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo
          ? new Date(params.dateTo + "T23:59:59").toISOString()
          : null,
      });
      if (error) throw error;
      return (data ?? {
        total: 0,
        by_status: {},
        ops_today: 0,
        ops_last_7d: 0,
        ops_last_30d: 0,
        unique_users: 0,
        avg_commit_seconds: null,
        median_commit_seconds: null,
        p95_commit_seconds: null,
        completion_rate: 0,
        failure_rate: 0,
        active_previews: 0,
      }) as AgentOperationMetrics;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useExternalMetrics(params: { dateFrom: string; dateTo: string }) {
  return useQuery<ExternalAgentSubmissionMetrics>({
    queryKey: ["admin", "external-agent-submission-metrics", params],
    queryFn: async () => {
      const { data, error } = await rpc(
        "admin_get_external_agent_submission_metrics",
        {
          p_date_from: params.dateFrom
            ? new Date(params.dateFrom).toISOString()
            : null,
          p_date_to: params.dateTo
            ? new Date(params.dateTo + "T23:59:59").toISOString()
            : null,
        }
      );
      if (error) throw error;
      return (data ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        by_source: {},
      }) as ExternalAgentSubmissionMetrics;
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
