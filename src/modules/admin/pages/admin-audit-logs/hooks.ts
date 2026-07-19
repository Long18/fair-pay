import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { useAdminTranslation } from "../../i18n";
import type { AuditLogsResponse, AuditStats, AuditFilterOptions } from "../../types";
import { PAGE_SIZE } from "./constants";

export function useAuditLogs(params: {
  search: string;
  actionFilter: string;
  tableFilter: string;
  actorFilter: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}) {
  return useQuery<AuditLogsResponse>({
    queryKey: ["admin", "audit-logs", params],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("read_admin_audit_logs", {
        p_search: params.search || null,
        p_action_type: params.actionFilter !== "all" ? params.actionFilter : null,
        p_table_name: params.tableFilter !== "all" ? params.tableFilter : null,
        p_actor_id: params.actorFilter !== "all" ? params.actorFilter : null,
        p_date_from: params.dateFrom ? new Date(params.dateFrom).toISOString() : null,
        p_date_to: params.dateTo ? new Date(params.dateTo + "T23:59:59").toISOString() : null,
        p_limit: PAGE_SIZE,
        p_offset: params.page * PAGE_SIZE,
      });
      if (error) throw error;
      return data as AuditLogsResponse;
    },
    staleTime: 15_000,
  });
}

export function useAuditStats() {
  return useQuery<AuditStats>({
    queryKey: ["admin", "audit-stats"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_stats");
      if (error) throw error;
      return data as AuditStats;
    },
    staleTime: 30_000,
  });
}

export function useAuditFilterOptions() {
  return useQuery<AuditFilterOptions>({
    queryKey: ["admin", "audit-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_audit_filter_options");
      if (error) throw error;
      return data as AuditFilterOptions;
    },
    staleTime: 60_000,
  });
}

export function useRevertAuditEntry() {
  const queryClient = useQueryClient();
  const { tAdmin } = useAdminTranslation();

  return useMutation<
    { success: boolean; reverted_audit_id: string; action: string; table_name: string; record_id: string },
    Error,
    string
  >({
    mutationFn: async (auditId: string) => {
      const { data, error } = await supabaseClient.rpc("admin_revert_audit_entry", {
        p_audit_id: auditId,
      });
      if (error) throw new Error(error.message);
      return data as { success: boolean; reverted_audit_id: string; action: string; table_name: string; record_id: string };
    },
    onSuccess: (data) => {
      toast.success(tAdmin("auditLogs.revertSuccess", { action: data.action, table: data.table_name }));
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-stats"] });
    },
    onError: (error) => {
      toast.error(tAdmin("auditLogs.revertError", { message: error.message }));
    },
  });
}
