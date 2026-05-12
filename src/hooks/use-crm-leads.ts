import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface CrmStage {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  emoji: string | null;
  color: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface CrmLead {
  id: number;
  tenant_name: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  channel: string | null;
  last_message: string | null;
  last_interaction: string | null;
  stage_slug: string;
  stage_name: string;
  ticket_value: number | null;
  is_vip: boolean;
  is_hot: boolean;
  phone_quality: string | null;
  source: string | null;
  origin: string | null;
  assignee: string | null;
  tags: string[] | null;
  stale_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsByStage {
  [stageSlug: string]: CrmLead[];
}

export interface CountsByStage {
  [stageSlug: string]: number;
}

// =============================================================================
// Hook
// =============================================================================

export const CRM_LEADS_QUERY_KEY = "crm-leads";

/**
 * Fetch CRM leads + pipeline stages for the Arruda Imobi tenant.
 * Falls back to legacy contacts if CRM tables are unavailable.
 */
export function useCrmLeads() {
  const { tenantId, isReady, session } = useAuth();
  const ARRUDA_TENANT = "Arruda Imobi";

  // Fetch stages
  const stagesQuery = useQuery({
    queryKey: [CRM_LEADS_QUERY_KEY, "stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipeline_stages")
        .select("id, slug, name, sort_order, emoji, color, is_default, is_active")
        .eq("is_active", true)
        .order("sort_order");

      if (error) {
        console.error("CRM stages error:", error);
        return [] as CrmStage[];
      }
      return (data ?? []) as CrmStage[];
    },
    enabled: isReady,
    staleTime: 5 * 60_000,
  });

  // Fetch leads
  const leadsQuery = useQuery({
    queryKey: [CRM_LEADS_QUERY_KEY, "leads", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("*")
        .eq("tenant_name", ARRUDA_TENANT)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("CRM leads error:", error);
        // Fallback: return empty but don't throw - let UI decide
        return [] as CrmLead[];
      }
      return (data ?? []) as CrmLead[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 2 * 60_000,
  });

  // Group leads by stage slug
  const leadsByStage: LeadsByStage = {};
  const countsByStage: CountsByStage = {};

  if (leadsQuery.data) {
    for (const lead of leadsQuery.data) {
      const slug = lead.stage_slug || "novos_leads_ia";
      if (!leadsByStage[slug]) {
        leadsByStage[slug] = [];
        countsByStage[slug] = 0;
      }
      leadsByStage[slug].push(lead);
      countsByStage[slug]++;
    }
  }

  return {
    stages: stagesQuery.data ?? [],
    leads: leadsQuery.data ?? [],
    leadsByStage,
    countsByStage,
    total: leadsQuery.data?.length ?? 0,
    loading: stagesQuery.isLoading || leadsQuery.isLoading,
    error: stagesQuery.error || leadsQuery.error,
    refetch: () => {
      stagesQuery.refetch();
      leadsQuery.refetch();
    },
    // Is CRM data available?
    isCrmAvailable: !!(leadsQuery.data && leadsQuery.data.length > 0),
    // Fallback mode
    isFallbackMode: !(leadsQuery.data && leadsQuery.data.length > 0),
  };
}

// =============================================================================
// Filter helpers
// =============================================================================

export function filterLeads(
  leads: CrmLead[],
  filters: {
    search?: string;
    stageSlug?: string;
    channel?: string;
    isVip?: boolean;
    isHot?: boolean;
    staleOnly?: boolean;
  }
): CrmLead[] {
  let result = [...leads];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.last_message?.toLowerCase().includes(q)
    );
  }

  if (filters.stageSlug) {
    result = result.filter((l) => l.stage_slug === filters.stageSlug);
  }

  if (filters.channel) {
    result = result.filter((l) => l.channel === filters.channel);
  }

  if (filters.isVip) {
    result = result.filter((l) => l.is_vip);
  }

  if (filters.isHot) {
    result = result.filter((l) => l.is_hot);
  }

  if (filters.staleOnly) {
    result = result.filter((l) => (l.stale_hours ?? 0) > 0);
  }

  return result;
}