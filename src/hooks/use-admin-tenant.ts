import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

export function useAdminTenant() {
  const { tenantId, isReady } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["admin-tenant", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId!).single();
      if (error) throw error;
      return data;
    },
    enabled: isReady && !!tenantId,
  });

  const getCurrentSettings = (): TenantSettings => {
    if (!tenantId) return ((query.data?.settings as TenantSettings) || {});
    const cached = queryClient.getQueryData<{ settings: TenantSettings } | undefined>(["admin-tenant", tenantId]);
    return ((cached?.settings as TenantSettings) || (query.data?.settings as TenantSettings) || {});
  };

  const saveSettings = async (partial: Partial<TenantSettings>) => {
    if (!tenantId) throw new Error("Tenant não encontrado");
    const merged: TenantSettings = { ...getCurrentSettings(), ...partial };
    const { error } = await supabase
      .from("tenants")
      .update({ settings: merged as TenantSettings })
      .eq("id", tenantId);
    if (error) throw error;

    queryClient.setQueryData(["admin-tenant", tenantId], (c: { settings: TenantSettings } | undefined) =>
      c ? { ...c, settings: merged } : c
    );
    queryClient.setQueryData(["tenant-settings"], (c: { settings: TenantSettings } | undefined) =>
      c ? { ...c, settings: merged } : c
    );
    queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
    queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
    return merged;
  };

  return { tenant: query.data, isLoading: query.isLoading, tenantId, getCurrentSettings, saveSettings, queryClient, toast };
}
