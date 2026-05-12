import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TenantSettings } from "@/hooks/use-tenant-settings";

interface CachedTenant {
  id: string;
  settings?: Record<string, unknown>;
}

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
    const cached = queryClient.getQueryData<CachedTenant | undefined>(["admin-tenant", tenantId]);
    return ((cached?.settings as TenantSettings) || (query.data?.settings as TenantSettings) || {});
  };

  const saveSettings = async (partial: Partial<TenantSettings>) => {
    if (!tenantId) throw new Error("Tenant não encontrado");
    const merged: TenantSettings = { ...getCurrentSettings(), ...partial };
    const { error } = await supabase
      .from("tenants")
      .update({ settings: merged as unknown as Record<string, unknown> })
      .eq("id", tenantId);
    if (error) throw error;

    queryClient.setQueryData<CachedTenant | undefined>(["admin-tenant", tenantId], (c) =>
      c ? { ...c, settings: merged as unknown as Record<string, unknown> } : c
    );
    queryClient.setQueryData<{ settings: TenantSettings } | undefined>(["tenant-settings"], (c) =>
      c ? { ...c, settings: merged } : c
    );
    queryClient.invalidateQueries({ queryKey: ["admin-tenant"] });
    queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
    return merged;
  };

  return { tenant: query.data, isLoading: query.isLoading, tenantId, getCurrentSettings, saveSettings, queryClient, toast };
}