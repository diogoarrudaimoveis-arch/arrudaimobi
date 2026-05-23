import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Owner {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf_cnpj: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  pix_key: string | null;
  signature_url: string | null;
  created_at: string;
}

export const OWNERS_QUERY_KEY = ["admin-owners"];

export function useOwners() {
  const { tenantId, isReady } = useAuth();

  return useQuery({
    queryKey: [...OWNERS_QUERY_KEY, tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owners")
        .select("*")
        .eq("tenant_id", tenantId!)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data as Owner[];
    },
    enabled: isReady && !!tenantId,
  });
}

export function useCreateOwnerMutation() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newOwner: Partial<Owner>) => {
      const { data, error } = await supabase
        .from("owners")
        .insert([{ ...newOwner, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      return data as Owner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY });
      toast.success("Proprietário cadastrado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao cadastrar proprietário: " + error.message);
    },
  });
}

export function useUpdateOwnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Owner> & { id: string }) => {
      const { data, error } = await supabase
        .from("owners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Owner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY });
      toast.success("Dados atualizados com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar dados: " + error.message);
    },
  });
}

export function useDeleteOwnerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("owners")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OWNERS_QUERY_KEY });
      toast.success("Proprietário arquivado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao arquivar: " + error.message);
    },
  });
}

