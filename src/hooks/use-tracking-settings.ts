import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantSettings } from "./use-tenant-settings";

export function useTrackingSettings() {
  const { data: tenant } = useTenantSettings();
  
  return useQuery({
    queryKey: ["portal-marketing-settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data, error } = await supabase
        .from("portal_marketing_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });
}
