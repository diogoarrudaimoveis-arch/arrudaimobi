import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const CONTACTS_QUERY_KEY = "contacts";

// =============================================================================
// Types
// =============================================================================

export type ContactStatus = "new" | "read" | "replied" | "archived";

export interface Contact {
  id: string;
  tenant_id: string;
  property_id: string | null;
  agent_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: ContactStatus;
  is_external_lead: boolean;
  external_source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  /** Quando definido, filtra apenas leads externos (true) ou orgânicos (false) */
  isExternalLead?: boolean;
  /** Filtrar por fonte específica (ex: 'whatsapp_bot') */
  externalSource?: string;
  status?: ContactStatus;
  agentId?: string;
}

export interface LeadMetrics {
  total: number;
  external: number;
  organic: number;
  newLeads: number;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Lista contatos do tenant com filtros opcionais por tipo de lead.
 */
export function useContacts(filters: ContactFilters = {}) {
  const { tenantId, isReady } = useAuth();

  return useQuery<Contact[]>({
    queryKey: [CONTACTS_QUERY_KEY, "list", tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });

      if (filters.isExternalLead !== undefined) {
        query = query.eq("is_external_lead", filters.isExternalLead);
      }
      if (filters.externalSource) {
        query = query.eq("external_source", filters.externalSource);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.agentId) {
        query = query.eq("agent_id", filters.agentId);
      }

      const { data, error } = await query;
      if (error) {
        toast.error("Erro ao carregar contatos");
        throw error;
      }
      return (data ?? []) as Contact[];
    },
    enabled: isReady && !!tenantId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Métricas agregadas de leads para o Dashboard (total, externos, orgânicos, novos).
 * Usa 4 queries leves com `head: true` para minimizar transferência de dados.
 */
export function useLeadMetrics() {
  const { tenantId, isReady } = useAuth();

  return useQuery<LeadMetrics>({
    queryKey: [CONTACTS_QUERY_KEY, "metrics", tenantId],
    queryFn: async () => {
      const [total, external, newLeads] = await Promise.all([
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId!),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("is_external_lead", true),
        supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId!)
          .eq("status", "new"),
      ]);

      const totalCount = total.count ?? 0;
      const externalCount = external.count ?? 0;

      return {
        total: totalCount,
        external: externalCount,
        organic: totalCount - externalCount,
        newLeads: newLeads.count ?? 0,
      };
    },
    enabled: isReady && !!tenantId,
    staleTime: 2 * 60_000,
  });
}

/**
 * Atualiza o status de um contato (ex: marcar como lido, respondido, arquivado).
 */
export function useUpdateContactStatus() {
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContactStatus }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
      toast.success("Status atualizado");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });
}
