import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ARRUDA_TENANT = "Arruda Imobi";

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

export const CRM_LEADS_QUERY_KEY = "crm-leads";

/**
 * Fetch CRM leads + pipeline stages via Edge Function (server-side, uses service_role).
 * Falls back to direct Supabase query if Edge Function is unavailable.
 * Direct queries use anon key and will show empty if RLS blocks access.
 */
export function useCrmLeads() {
  const { session, isReady } = useAuth();

  // PRIMARY: Call Edge Function (service_role bypasses RLS)
  const edgeQuery = useQuery({
    queryKey: [CRM_LEADS_QUERY_KEY, "edge", session?.user?.id],
    queryFn: async () => {
      if (!SUPABASE_URL) throw new Error("SUPABASE_URL not configured");
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-api?action=crm-admin-leads`,
        { headers }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      // Edge Function returns {ok: true} on success (success may be null)
      if (!json.ok && json.success === false) {
        throw new Error(json.error || "Edge Function error");
      }
      return json as {
        stages: CrmStage[];
        leads: CrmLead[];
        leadsByStage: LeadsByStage;
        countsByStage: CountsByStage;
        total: number;
      };
    },
    enabled: isReady && !!session?.access_token,
    staleTime: 2 * 60_000,
    retry: 1,
  });

  // FALLBACK: Direct Supabase query (anon key, RLS may block)
  const directQuery = useQuery({
    queryKey: [CRM_LEADS_QUERY_KEY, "direct"],
    queryFn: async () => {
      const [{ data: stagesData, error: sErr }, { data: leadsData, error: lErr }] = await Promise.all([
        supabase
          .from("crm_pipeline_stages")
          .select("id, slug, name, sort_order, emoji, color, is_default, is_active")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("crm_leads")
          .select("*")
          .eq("tenant_name", ARRUDA_TENANT)
          .order("updated_at", { ascending: false }),
      ]);

      if (sErr) console.error("stages error:", sErr);
      if (lErr) console.error("leads error:", lErr);

      return {
        stages: (stagesData ?? []) as CrmStage[],
        leads: (leadsData ?? []) as CrmLead[],
      };
    },
    enabled: isReady,
    staleTime: 5 * 60_000,
  });

  // Use Edge data if available, otherwise direct
  const stages = edgeQuery.data?.stages ?? directQuery.data?.stages ?? [];
  const leads = edgeQuery.data?.leads ?? directQuery.data?.leads ?? [];
  const countsByStage: CountsByStage = edgeQuery.data?.countsByStage ?? {};
  const total = edgeQuery.data?.total ?? leads.length;

  // Group leads by stage slug (if not already grouped by Edge)
  const leadsByStage: LeadsByStage = {};
  if (!edgeQuery.data?.leadsByStage && leads.length > 0) {
    for (const lead of leads) {
      const slug = lead.stage_slug || "novos_leads_ia";
      if (!leadsByStage[slug]) { leadsByStage[slug] = []; }
      leadsByStage[slug].push(lead);
    }
  } else if (edgeQuery.data?.leadsByStage) {
    Object.assign(leadsByStage, edgeQuery.data.leadsByStage);
  }

  const loading = (edgeQuery.isLoading && !edgeQuery.data) || 
                  (directQuery.isLoading && !directQuery.data);
  const error = edgeQuery.error || (directQuery.error as Error | null);

  return {
    stages,
    leads,
    leadsByStage,
    countsByStage,
    total,
    loading,
    error,
    refetch: () => {
      edgeQuery.refetch();
      directQuery.refetch();
    },
    isEdgeAvailable: !!edgeQuery.data,
    // Alias for backward compatibility with AdminContacts
    isCrmAvailable: !!edgeQuery.data,
    isFallbackMode: !edgeQuery.data && !directQuery.data,
  };
}

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
  if (filters.stageSlug) result = result.filter((l) => l.stage_slug === filters.stageSlug);
  if (filters.channel) result = result.filter((l) => l.channel === filters.channel);
  if (filters.isVip) result = result.filter((l) => l.is_vip);
  if (filters.isHot) result = result.filter((l) => l.is_hot);
  if (filters.staleOnly) result = result.filter((l) => (l.stale_hours ?? 0) > 0);
  return result;
}
