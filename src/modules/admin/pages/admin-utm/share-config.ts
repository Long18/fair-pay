import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "@/utility/supabaseClient";
import type { UtmPlatform, UtmShareConfig } from "@/lib/utm-config";

export function useShareConfig() {
  return useQuery({
    queryKey: ["admin", "utm-config"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("admin_get_utm_config");
      if (error) throw error;
      return data as unknown as UtmShareConfig;
    },
    staleTime: 30_000,
  });
}

export function getShareSource(platform: UtmPlatform | null | undefined) {
  if (!platform) return "unknown";
  return platform.source || platform.platform_key || "unknown";
}
